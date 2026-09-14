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

    default:
        fail('Action tidak dikenali: ' . $action);
}