<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
    case 'list':
        cleanup_stale_locks($pdo);
        $tier = $_GET['tier'] ?? '';
        $area = $_GET['area'] ?? '';
        $sql = "SELECT l.*,
                    COALESCE((SELECT MIN(price) FROM slotTemplates t WHERE t.locationId=l.id),0) AS priceFrom,
                    (SELECT GROUP_CONCAT(DISTINCT sessionLabel) FROM slotTemplates t WHERE t.locationId=l.id) AS sessions
                FROM locations l WHERE l.isActive=1";
        $where = [];
        $vals = [];
        if ($tier !== '') {
            $where[] = "l.tier = ?";
            $vals[] = $tier;
        }
        if ($area !== '') {
            $where[] = "l.area = ?";
            $vals[] = $area;
        }
        if ($where) {
            $sql .= ' AND ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY l.tier, l.name';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($vals);
        ok(['locations' => $stmt->fetchAll()]);
        break;

    case 'areas':
        $stmt = $pdo->query("SELECT DISTINCT area FROM locations WHERE isActive=1 ORDER BY area");
        ok(['areas' => array_column($stmt->fetchAll(), 'area')]);
        break;

    case 'overview':
        cleanup_stale_locks($pdo);
        $locationId = (int)($_GET['locationId'] ?? 0);
        $daysAhead = min(30, max(1, (int)($_GET['days'] ?? 14)));

        $locStmt = $pdo->prepare("SELECT * FROM locations WHERE id=? AND isActive=1");
        $locStmt->execute([$locationId]);
        $loc = $locStmt->fetch();
        if (!$loc) {
            fail('Lokasi tidak dijumpai.');
        }

        $availability = [];
        ensure_slots($pdo, $locationId, $daysAhead);
        $now = time();
        $templates = $pdo->prepare("SELECT * FROM slotTemplates WHERE locationId=? AND isActive=1");
        $templates->execute([$locationId]);
        $templates = $templates->fetchAll();

        for ($i = 0; $i < $daysAhead; $i++) {
            $ts = mktime(0, 0, 0, date('n', $now), date('j', $now) + $i, date('Y', $now));
            $date = date('Y-m-d', $ts);
            $day = date('D', $ts);
            $daySlots = [];
            foreach ($templates as $t) {
                if (!in_array($day, str_split_days($t['days']), true)) {
                    continue;
                }
                $startTs = strtotime($date . ' ' . $t['startTime']);
                $endTs = $t['endTime'] === '00:00' ? strtotime($date . ' next day') : strtotime($date . ' ' . $t['endTime']);
                if ($endTs <= $now + 3600) {
                    continue;
                }
                $stmt = $pdo->prepare("SELECT * FROM slots WHERE locationId=? AND date=? AND startTime=?");
                $stmt->execute([$locationId, $date, $t['startTime']]);
                $slot = $stmt->fetch();
                if (!$slot) {
                    $pdo->prepare("INSERT INTO slots (locationId,date,startTime,endTime,price,status)
                        VALUES (?,?,?,?,?,?)")->execute([
                        $locationId, $date, $t['startTime'], $t['endTime'], $t['price'], 'Tersedia',
                    ]);
                    $slot = [
                        'id' => $pdo->lastInsertId(),
                        'locationId' => $locationId,
                        'date' => $date,
                        'startTime' => $t['startTime'],
                        'endTime' => $t['endTime'],
                        'price' => $t['price'],
                        'status' => 'Tersedia',
                        'bookedBy' => null,
                        'timeLeft' => ($startTs - $now) > 0 ? ($startTs - $now) : 0,
                    ];
                } else {
                    $slot['timeLeft'] = ($startTs - $now) > 0 ? ($startTs - $now) : 0;
                }
                $slot['sessionLabel'] = $t['sessionLabel'];
                $daySlots[] = $slot;
            }
            if ($daySlots) {
                $availability[] = ['date' => $date, 'day' => $day, 'slots' => $daySlots];
            }
        }

        ok(['location' => $loc, 'availability' => $availability]);
        break;

    case 'booking':
        $slotId = (int)($_GET['slotId'] ?? 0);
        $stmt = $pdo->prepare("SELECT s.*, l.name AS locationName, l.area, l.address, l.image
            FROM slots s JOIN locations l ON l.id=s.locationId WHERE s.id=?");
        $stmt->execute([$slotId]);
        $slot = $stmt->fetch();
        if (!$slot) {
            fail('Slot tidak dijumpai.');
        }
        ok(['slot' => $slot]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}