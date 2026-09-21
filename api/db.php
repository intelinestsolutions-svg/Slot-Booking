<?php

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        if (!is_dir(DB_DIR)) {
            mkdir(DB_DIR, 0775, true);
        }
        $pdo = new PDO('sqlite:' . DB_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA journal_mode = WAL;');
        schema($pdo);
        seed($pdo);
    }
    return $pdo;
}

function schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'busker',
        fullName TEXT,
        icNumber TEXT,
        phone TEXT,
        state TEXT,
        city TEXT,
        address TEXT,
        postcode TEXT,
        stageName TEXT,
        genre TEXT,
        description TEXT,
        instagram TEXT,
        tiktok TEXT,
        verificationStatus TEXT NOT NULL DEFAULT 'pending',
        isActive INTEGER NOT NULL DEFAULT 0,
        isPremium INTEGER NOT NULL DEFAULT 0,
        isCoordinator INTEGER NOT NULL DEFAULT 0,
        coordinatorType TEXT,
        isOku INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL DEFAULT 'ms',
        avatar TEXT,
        token TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $cols = array_column($pdo->query("PRAGMA table_info(users)")->fetchAll(), 'name');
    if (!in_array('avatar', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN avatar TEXT");
    }
    if (!in_array('whatsappNumber', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN whatsappNumber TEXT");
    }
    if (!in_array('premiumExpiresAt', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN premiumExpiresAt TEXT");
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS buskerApplications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        appId TEXT UNIQUE,
        fullName TEXT,
        icNumber TEXT,
        phone TEXT,
        email TEXT,
        state TEXT,
        city TEXT,
        address TEXT,
        postcode TEXT,
        stageName TEXT,
        genre TEXT,
        description TEXT,
        instagram TEXT,
        tiktok TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        name TEXT,
        area TEXT,
        city TEXT NOT NULL DEFAULT 'Kota Kinabalu',
        state TEXT NOT NULL DEFAULT 'Sabah',
        pbt TEXT,
        address TEXT,
        tier TEXT NOT NULL DEFAULT 'Hotspot',
        lat REAL,
        lng REAL,
        image TEXT DEFAULT '',
        description TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS slotTemplates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locationId INTEGER NOT NULL,
        days TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        price REAL NOT NULL,
        sessionLabel TEXT,
        isActive INTEGER NOT NULL DEFAULT 1
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locationId INTEGER NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Tersedia',
        bookedBy INTEGER,
        lockedAt TEXT,
        billCode TEXT,
        UNIQUE(locationId, date, startTime)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slotId INTEGER,
        userId INTEGER,
        locationId INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        billCode TEXT,
        txnRef TEXT,
        amount REAL,
        attendancePhotoUrl TEXT,
        attendanceSubmittedAt TEXT,
        buskerStageName TEXT,
        buskerPhone TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $bcols = array_column($pdo->query("PRAGMA table_info(bookings)")->fetchAll(), 'name');
    if (!in_array('reminderSent', $bcols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN reminderSent INTEGER NOT NULL DEFAULT 0");
    }
    if (!in_array('reminderSentAt', $bcols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN reminderSentAt TEXT");
    }
    if (!in_array('reminderAttempts', $bcols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN reminderAttempts INTEGER NOT NULL DEFAULT 0");
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        bookingId INTEGER,
        amount REAL,
        billCode TEXT,
        txnRef TEXT,
        status TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        title TEXT,
        body TEXT,
        isRead INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locationId INTEGER,
        userId INTEGER,
        rating INTEGER,
        comment TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_location_user ON reviews (locationId, userId)");

    $pdo->exec("CREATE TABLE IF NOT EXISTS premiumPurchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        billCode TEXT UNIQUE,
        amount REAL,
        months INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS prayerTimes (
        date TEXT PRIMARY KEY,
        raw TEXT,
        fetchedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )");
}

function seed(PDO $pdo): void
{
    (function (PDO $pdo) {
        if (!empty($pdo->query('SELECT 1 FROM meta WHERE key=\'theme\'')->fetch())) {
            return;
        }

        $locations = [
            ['slug' => 'dataran-deasoka','name' => 'Dataran Deasoka','area' => 'Bandar','pbt' => 'DBKK','lat' => 5.9825,'lng' => 116.0747,
             'tier' => 'Hotspot','description' => 'Kawasan pentas utama DBKK di pusat bandar. Keramaian tinggi terutama hujung minggu.'],
            ['slug' => 'bsn','name' => 'BSN (Jalan Gaya)','area' => 'Bandar','pbt' => 'DBKK','lat' => 5.9840,'lng' => 116.0763,
             'tier' => 'Hotspot','description' => 'Hadapan bangunan BSN di Jalan Gaya. Laluan pejalan kaki yang sibuk.'],
            ['slug' => 'ex-pizza','name' => 'Ex-Pizza','area' => 'Bandar','pbt' => 'DBKK','lat' => 5.9834,'lng' => 116.0756,
             'tier' => 'Hotspot','description' => 'Bekas lokasi Pizza Hut, di kawasan tumpuan pengunjung.'],
            ['slug' => 'horizon-water-fountain','name' => 'Horizon Water Fountain','area' => 'Bandar','pbt' => 'DBKK','lat' => 5.9806,'lng' => 116.0733,
             'tier' => 'Hotspot','description' => 'Air pancut hadapan Horizon Hotel. Suasana tepi pantai bandar.'],
            ['slug' => 'jalan-jati','name' => 'Jalan Jati','area' => 'Bandar','pbt' => 'DBKK','lat' => 5.9819,'lng' => 116.0752,
             'tier' => 'Hotspot','description' => 'Sepanjang Jalan Jati, jalan utama pusat bandar.'],
            ['slug' => 'segama-waterfront-dolphin','name' => 'Segama Waterfront (Dolphin)','area' => 'Segama / Waterfront','pbt' => 'DBKK','lat' => 5.9755,'lng' => 116.0771,
             'tier' => 'Coldspot','description' => 'Arca Dolphin di Segama Waterfront. Pemandangan laut, sesuai persembahan santai petang.'],
            ['slug' => 'tanjung-lipat-likas','name' => 'Tanjung Lipat, Likas','area' => 'Likas','pbt' => 'DBKK','lat' => 5.9908,'lng' => 116.0853,
             'tier' => 'Coldspot','description' => 'Taman tepi pantai Tanjung Lipat, Likas. Ramai penduduk sekitar, petang.'],
            ['slug' => 'tanjung-aru','name' => 'Tanjung Aru','area' => 'Tanjung Aru','pbt' => 'DBKK','lat' => 5.9478,'lng' => 116.0517,
             'tier' => 'Hotspot','description' => 'Pantai Tanjung Aru. Visitor dan pelancong ramai sehingga matahari terbenam.'],
            ['slug' => 'kkia','name' => 'KKIA Arrival','area' => 'KKIA','pbt' => 'DBKK','lat' => 5.9444,'lng' => 116.0556,
             'tier' => 'Coldspot','description' => 'Lapangan Terbang Antarabangsa Kota Kinabalu — Kawasan Arrival. Slot 4 jam setiap hari.'],
            ['slug' => 'kkia-departure','name' => 'KKIA Departure','area' => 'KKIA','pbt' => 'DBKK','lat' => 5.9444,'lng' => 116.0556,
             'tier' => 'Coldspot','description' => 'Lapangan Terbang Antarabangsa Kota Kinabalu — Kawasan Departure. Slot 4 jam setiap hari.'],
        ];

        $stmt = $pdo->prepare("INSERT INTO locations (slug,name,area,city,state,pbt,tier,lat,lng,description) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $locIds = [];
        foreach ($locations as $i => $loc) {
            $stmt->execute([
                $loc['slug'], $loc['name'], $loc['area'], 'Kota Kinabalu', 'Sabah', $loc['pbt'],
                $loc['tier'], $loc['lat'], $loc['lng'], $loc['description'],
            ]);
            $locIds[$loc['slug']] = $pdo->lastInsertId();
        }

        $nights = ['Fri', 'Sat'];
        $sundays = ['Sun'];
        $everyday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        $templates = [];
        foreach (['dataran-deasoka', 'bsn', 'ex-pizza', 'horizon-water-fountain', 'jalan-jati'] as $slug) {
            $templates[] = [$locIds[$slug], implode(',', $nights), '18:30', '22:30', 10.00, 'Malam'];
            $templates[] = [$locIds[$slug], implode(',', $sundays), '06:30', '12:00', 10.00, 'Pagi'];
        }
        $templates[] = [$locIds['segama-waterfront-dolphin'], implode(',', $everyday), '17:30', '21:00', 5.00, 'Malam'];
        $templates[] = [$locIds['tanjung-lipat-likas'], implode(',', $everyday), '14:00', '17:30', 5.00, 'Petang'];
        $templates[] = [$locIds['tanjung-aru'], implode(',', $everyday), '14:00', '20:00', 10.00, 'Petang'];
        $templates[] = [$locIds['kkia'], implode(',', $everyday), '08:00', '12:00', 5.00, 'Pagi'];
        $templates[] = [$locIds['kkia'], implode(',', $everyday), '12:00', '16:00', 5.00, 'Tengah Hari'];
        $templates[] = [$locIds['kkia'], implode(',', $everyday), '16:00', '20:00', 5.00, 'Petang'];
        $templates[] = [$locIds['kkia'], implode(',', $everyday), '20:00', '00:00', 5.00, 'Malam'];
        $templates[] = [$locIds['kkia-departure'], implode(',', $everyday), '08:00', '12:00', 5.00, 'Pagi'];
        $templates[] = [$locIds['kkia-departure'], implode(',', $everyday), '12:00', '16:00', 5.00, 'Tengah Hari'];
        $templates[] = [$locIds['kkia-departure'], implode(',', $everyday), '16:00', '20:00', 5.00, 'Petang'];

        $tStmt = $pdo->prepare("INSERT INTO slotTemplates (locationId,days,startTime,endTime,price,sessionLabel) VALUES (?,?,?,?,?,?)");
        foreach ($templates as $t) {
            $tStmt->execute($t);
        }

        $pdo->prepare("INSERT INTO meta (key,value) VALUES ('theme','sunset-golden')")->execute();
        $pdo->prepare("INSERT INTO meta (key,value) VALUES ('seeded',datetime('now'))")->execute();

        if (defined('DEFAULT_ADMIN_EMAIL') && defined('DEFAULT_ADMIN_PASSWORD')
            && !empty(DEFAULT_ADMIN_EMAIL) && !empty(DEFAULT_ADMIN_PASSWORD)) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email=? AND role='admin'");
            $stmt->execute([DEFAULT_ADMIN_EMAIL]);
            if (!$stmt->fetch()) {
                $pdo->prepare("INSERT INTO users (email,password,role,fullName,verificationStatus,isActive,token)
                    VALUES (?,?,?,?,?,?,?)")
                    ->execute([
                        strtolower(DEFAULT_ADMIN_EMAIL),
                        password_hash(DEFAULT_ADMIN_PASSWORD, PASSWORD_DEFAULT),
                        'admin', 'Admin SBC', 'approved', 1, bin2hex(random_bytes(24)),
                    ]);
            }
        }
    })($pdo);
}

function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void
{
    json_out(['success' => false, 'error' => $message], $code);
}

function ok(array $data = []): void
{
    json_out(['success' => true] + $data);
}

function body(): array
{
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) {
        return $json;
    }
    return $_REQUEST;
}

function str_split_days(string $days): array
{
    return array_map('trim', explode(',', $days));
}

function day_of_week(string $date): string
{
    return date('D', strtotime($date));
}

function bearer_token(): string
{
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if ($auth === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    }
    $token = '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        $token = trim($m[1]);
    }
    if ($token === '') {
        $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    }
    if ($token === '') {
        $token = isset($_GET['token']) ? (string)$_GET['token'] : '';
    }
    return $token;
}

function issue_session(PDO $pdo, int $userId, string $token): void
{
    $pdo->prepare("INSERT INTO sessions (userId, token) VALUES (?, ?)")
        ->execute([$userId, $token]);
}

function current_user(PDO $pdo): ?array
{
    $token = bearer_token();
    if ($token === '') {
        return null;
    }
    $stmt = $pdo->prepare("SELECT u.* FROM users u JOIN sessions s ON s.userId = u.id WHERE s.token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch();
    }
    return $user ?: null;
}

function cleanup_stale_locks(PDO $pdo): void
{
    $cutoff = date('Y-m-d H:i:s', time() - 600);
    $stmt = $pdo->prepare("SELECT id FROM slots WHERE status='Pra-tempah' AND lockedAt IS NOT NULL AND lockedAt < ?");
    $stmt->execute([$cutoff]);
    $ids = array_column($stmt->fetchAll(), 'id');
    if ($ids) {
        $in = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE slotId IN ($in) AND status='pending'")->execute($ids);
        $pdo->prepare("UPDATE slots SET status='Tersedia', bookedBy=NULL, lockedAt=NULL, billCode=NULL WHERE id IN ($in)")->execute($ids);
    }
}

function ensure_slots(PDO $pdo, int $locationId, int $daysAhead): void
{
    $daysAhead = min(30, max(1, $daysAhead));
    $now = time();
    $templates = $pdo->prepare("SELECT * FROM slotTemplates WHERE locationId=? AND isActive=1");
    $templates->execute([$locationId]);
    $templates = $templates->fetchAll();
    if (!$templates) {
        return;
    }

    $find = $pdo->prepare("SELECT id FROM slots WHERE locationId=? AND date=? AND startTime=?");
    $ins  = $pdo->prepare("INSERT INTO slots (locationId,date,startTime,endTime,price,status)
        VALUES (?,?,?,?,?,?)");

    for ($i = 0; $i <= $daysAhead; $i++) {
        $ts = mktime(0, 0, 0, date('n', $now), date('j', $now) + $i, date('Y', $now));
        $date = date('Y-m-d', $ts);
        $day = date('D', $ts);
        foreach ($templates as $t) {
            if (!in_array($day, str_split_days($t['days']), true)) {
                continue;
            }
            $startTs = strtotime($date . ' ' . $t['startTime']);
            $endTs = $t['endTime'] === '00:00' ? strtotime($date . ' next day') : strtotime($date . ' ' . $t['endTime']);
            if ($endTs <= $now + 3600) {
                continue;
            }
            $find->execute([$locationId, $date, $t['startTime']]);
            if (!$find->fetch()) {
                $ins->execute([$locationId, $date, $t['startTime'], $t['endTime'], $t['price'], 'Tersedia']);
            }
        }
    }
}

function require_user(PDO $pdo): array
{
    $user = current_user($pdo);
    if (!$user) {
        fail('Sila log masuk dahulu.', 401);
    }
    return $user;
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}