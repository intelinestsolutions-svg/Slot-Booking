<?php

require_once __DIR__ . '/db.php';

date_default_timezone_set('Asia/Kuching');

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const PRAYER_FALLBACK = ['Fajr' => '05:05', 'Dhuhr' => '12:12', 'Asr' => '15:27', 'Maghrib' => '18:26', 'Isha' => '19:36'];

function parse_time(string $t): int
{
    $p = explode(':', $t);
    return ((int)$p[0]) * 60 + (int)$p[1];
}

/** Waktu Solat Malaysia (JAKIM data) — zon Kota Kinabalu. */
const PRAYER_ZONE = 'SBH07';

function fetch_prayer_times(PDO $pdo, string $date): array
{
    $row = $pdo->prepare("SELECT raw FROM prayerTimes WHERE date = ?");
    $row->execute([$date]);
    $cached = $row->fetchColumn();

    if ($cached) {
        $data = json_decode($cached, true);
        if (is_array($data) && isset($data['Fajr'])) {
            $data['source'] = 'cached';
            return $data;
        }
    }

    $data = PRAYER_FALLBACK;
    $data['source'] = 'fallback';

    $ym = explode('-', $date);
    $url = 'https://api.waktusolat.app/v2/solat/' . PRAYER_ZONE
        . '?year=' . (int)$ym[0] . '&month=' . (int)$ym[1];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'SBCBooking/1.0',
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($res && $code === 200) {
        $json = json_decode($res, true);
        $prayers = is_array($json) && isset($json['prayers']) ? $json['prayers'] : [];
        $month = [];
        $want = (int)date('j', strtotime($date));

        $ins = $pdo->prepare("INSERT OR REPLACE INTO prayerTimes (date, raw) VALUES (?,?)");
        foreach ($prayers as $p) {
            $times = [];
            foreach (['Fajr' => 'fajr', 'Dhuhr' => 'dhuhr', 'Asr' => 'asr', 'Maghrib' => 'maghrib', 'Isha' => 'isha'] as $name => $key) {
                if (!isset($p['day'], $p[$key]) || !is_numeric($p[$key])) {
                    continue 2;
                }
                $times[$name] = date('H:i', (int)$p[$key]); // UTC → Asia/Kuching (ini_set timezone)
            }
            if (count($times) === count(PRAYER_NAMES)) {
                $d = sprintf('%04d-%02d-%02d', (int)$ym[0], (int)$ym[1], (int)$p['day']);
                $ins->execute([$d, json_encode($times)]);
                if ((int)$p['day'] === $want) {
                    $month = $times;
                }
            }
        }

        if ($month) {
            $row = $pdo->prepare("SELECT raw FROM prayerTimes WHERE date = ?");
            $row->execute([$date]);
            $data = json_decode((string)$row->fetchColumn(), true);
            $data['source'] = 'waktusolat';
            return $data;
        }
    }

    // Last-resort: a plan-B provider (Aladhan) before static fallback.
    $alt = 'https://api.aladhan.com/v1/timingsByCity?city=' . rawurlencode('Kota Kinabalu')
        . '&country=' . rawurlencode('Malaysia')
        . '&method=' . urlencode('3') . '&date=' . rawurlencode($date)
        . '&latitudeAdjustmentMethod=' . urlencode('3');
    $ch = curl_init($alt);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'SBCBooking/1.0',
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($res && $code === 200) {
        $json = json_decode($res, true);
        $t = $json['data']['timings'] ?? null;
        if (is_array($t)) {
            $out = [];
            foreach (PRAYER_NAMES as $n) {
                if (isset($t[$n]) && preg_match('/^\d{1,2}:\d{2}$/', $t[$n])) {
                    $out[$n] = $t[$n];
                }
            }
            if (count($out) === count(PRAYER_NAMES)) {
                $data = $out;
                $data['source'] = 'aladhan';
                $pdo->prepare("INSERT OR REPLACE INTO prayerTimes (date, raw) VALUES (?,?)")
                    ->execute([$date, json_encode($out)]);
            }
        }
    }

    return $data;
}

function prayer_state(PDO $pdo, string $date): array
{
    $times = fetch_prayer_times($pdo, $date);
    $now = (int)date('G') * 60 + (int)date('i');

    $list = [];
    foreach (PRAYER_NAMES as $n) {
        $list[] = ['name' => $n, 'time' => $times[$n], 'minutes' => parse_time($times[$n])];
    }
    $list[] = ['name' => 'Fajr (esok)', 'time' => $times['Fajr'], 'minutes' => parse_time($times['Fajr']) + 1440];

    $active = null;
    $next = null;
    for ($i = 0; $i < count(PRAYER_NAMES); $i++) {
        $start = $list[$i]['minutes'];
        $end = $list[$i + 1]['minutes'];
        if ($now >= $start && $now < $end) {
            $active = PRAYER_NAMES[$i];
            $next = $list[$i + 1];
            break;
        }
        if ($now < $start && !$next) {
            $next = ['name' => PRAYER_NAMES[$i], 'time' => $times[PRAYER_NAMES[$i]], 'minutes' => $start];
            break;
        }
    }

    $due = null;
    if ($active !== null) {
        $timeLeft = $list[array_search($active, PRAYER_NAMES) + 1]['minutes'] - $now;
        $due = ['name' => $active, 'validUntil' => $list[array_search($active, PRAYER_NAMES) + 1]['time']];
    }

    return [
        'date' => $date,
        'times' => [],
        'prayers' => $list,
        'active' => $active,
        'due' => $due,
        'next' => $next ? ['name' => $next['name'], 'time' => $next['time']] : null,
        'source' => $times['source'],
    ];
}

$action = $_GET['action'] ?? 'today';
$pdo = db();

switch ($action) {
    case 'today':
        header('Content-Type: application/json');
        echo json_encode(prayer_state($pdo, date('Y-m-d')));
        break;

    default:
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Tindakan tidak sah.']);
        break;
}