<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
    case 'busker_list':
        $stmt = $pdo->prepare("SELECT id,stageName,genre,city,state,description,instagram,tiktok,isCoordinator,coordinatorType,isOku
            FROM users WHERE role='busker' AND verificationStatus='approved' AND isActive=1
            ORDER BY stageName");
        $stmt->execute();
        ok(['buskers' => $stmt->fetchAll()]);
        break;

    case 'notifications':
        $user = require_user($pdo);
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT 50");
        $stmt->execute([$user['id']]);
        ok(['notifications' => $stmt->fetchAll()]);
        break;

    case 'mark_read':
        $user = require_user($pdo);
        $pdo->prepare("UPDATE notifications SET isRead=1 WHERE userId=?")->execute([$user['id']]);
        ok();
        break;

    case 'stats':
        $one = fn($q) => (int)$pdo->query($q)->fetchColumn();
        ok([
            'buskers'  => $one("SELECT COUNT(*) FROM users WHERE role='busker' AND verificationStatus='approved'"),
            'locations'=> $one("SELECT COUNT(*) FROM locations WHERE isActive=1"),
            'bookings' => $one("SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','completed')"),
            'revenue'  => round((float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM bookings WHERE status IN ('confirmed','completed')")->fetchColumn(), 2),
        ]);
        break;

    case 'location_reviews':
        $locationId = (int)($_GET['locationId'] ?? 0);
        if (!$locationId) {
            fail('Parameter tidak sah.');
        }
        $aggStmt = $pdo->prepare("SELECT COUNT(*) AS cnt, COALESCE(AVG(rating),0) AS avg
            FROM reviews WHERE locationId=?");
        $aggStmt->execute([$locationId]);
        $agg = $aggStmt->fetch();
        $listStmt = $pdo->prepare("SELECT r.*, u.stageName
            FROM reviews r LEFT JOIN users u ON u.id=r.userId
            WHERE r.locationId=? ORDER BY r.createdAt DESC LIMIT 50");
        $listStmt->execute([$locationId]);
        ok([
            'locationId' => $locationId,
            'ratingCount'=> (int)($agg['cnt'] ?? 0),
            'ratingAvg'  => round((float)($agg['avg'] ?? 0), 1),
            'reviews'    => $listStmt->fetchAll(),
        ]);
        break;

    case 'add_review':
        $user = require_user($pdo);
        if ($user['role'] !== 'busker') {
            fail('Hanya busker boleh menghantar ulasan.');
        }
        if ($user['verificationStatus'] !== 'approved') {
            fail('Akaun anda mesti diluluskan admin dahulu.');
        }
        $d = body();
        $locationId = (int)($d['locationId'] ?? 0);
        $rating = (int)($d['rating'] ?? 0);
        $comment = trim((string)($d['comment'] ?? ''));
        if (!$locationId || $rating < 1 || $rating > 5) {
            fail('Nilai ulasan tidak sah.');
        }
        if (strlen($comment) > 600) {
            fail('Ulasan terlalu panjang (maks 600 aksara).');
        }

        $locStmt = $pdo->prepare("SELECT id FROM locations WHERE id=? AND isActive=1");
        $locStmt->execute([$locationId]);
        if (!$locStmt->fetch()) {
            fail('Lokasi tidak dijumpai.');
        }

        $doneStmt = $pdo->prepare("SELECT COUNT(*) FROM bookings b
            WHERE b.userId=? AND b.locationId=? AND b.status='completed'");
        $doneStmt->execute([$user['id'], $locationId]);
        if ((int)$doneStmt->fetchColumn() === 0) {
            fail('Anda hanya boleh mengulas lokasi selepas slot yang lengkap.');
        }

        $stmt = $pdo->prepare("SELECT id FROM reviews WHERE locationId=? AND userId=?");
        $stmt->execute([$locationId, $user['id']]);
        if ($stmt->fetch()) {
            $pdo->prepare("UPDATE reviews SET rating=?, comment=? WHERE locationId=? AND userId=?")
                ->execute([$rating, $comment, $locationId, $user['id']]);
        } else {
            $pdo->prepare("INSERT INTO reviews (locationId,userId,rating,comment) VALUES (?,?,?,?)")
                ->execute([$locationId, $user['id'], $rating, $comment]);
        }
        ok(['rating' => $rating, 'message' => 'Ulasan anda telah disimpan.']);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}