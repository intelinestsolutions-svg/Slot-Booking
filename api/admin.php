<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

function admin_only(PDO $pdo): array
{
    $user = require_user($pdo);
    if ($user['role'] !== 'admin') {
        fail('Akses ditolak.', 403);
    }
    return $user;
}

switch ($action) {
    case 'applications':
        admin_only($pdo);
        $stmt = $pdo->query("SELECT a.*, u.role AS userRole, u.isActive, u.verificationStatus AS userStatus
            FROM buskerApplications a
            JOIN users u ON u.id = a.userId
            ORDER BY CASE a.status WHEN 'pending' THEN 0 ELSE 1 END, a.createdAt");
        ok(['applications' => $stmt->fetchAll()]);
        break;

    case 'approve':
        admin_only($pdo);
        $d = body();
        $appId = (int)($d['appId'] ?? 0);
        $action2 = $d['decision'] ?? 'approve';
        if (!$appId) {
            fail('ID permohonan tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT * FROM buskerApplications WHERE id=?");
        $stmt->execute([$appId]);
        $app = $stmt->fetch();
        if (!$app) {
            fail('Permohonan tidak dijumpai.');
        }
        if ($action2 === 'approve') {
            $pdo->prepare("UPDATE users SET verificationStatus='approved', isActive=1 WHERE id=?")->execute([$app['userId']]);
            $pdo->prepare("UPDATE buskerApplications SET status='approved' WHERE id=?")->execute([$appId]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Permohonan Diluluskan', 'Selamat datang! Anda kini boleh menempah slot busking.')")
                ->execute([$app['userId']]);
        } else {
            $pdo->prepare("UPDATE users SET verificationStatus='rejected', isActive=0 WHERE id=?")->execute([$app['userId']]);
            $pdo->prepare("UPDATE buskerApplications SET status='rejected' WHERE id=?")->execute([$appId]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Permohonan Ditolak', 'Sila hubungi admin untuk maklumat lanjut.')")
                ->execute([$app['userId']]);
        }
        ok();
        break;

    case 'financials':
        admin_only($pdo);
        $stmt = $pdo->query("SELECT t.*, u.stageName, l.name AS locationName
            FROM transactions t
            LEFT JOIN users u ON u.id = t.userId
            LEFT JOIN bookings b ON b.id = t.bookingId
            LEFT JOIN locations l ON l.id = b.locationId
            ORDER BY t.createdAt DESC LIMIT 200");
        ok(['transactions' => $stmt->fetchAll()]);
        break;

    case 'register_admin':
        $d = body();
        $setupKey = $d['setupKey'] ?? '';
        if ($setupKey !== VERIFY_TOKEN) {
            fail('Setup key tidak sah.', 403);
        }
        foreach (['email', 'password'] as $f) {
            if (empty($d[$f])) {
                fail('Email dan kata laluan diperlukan.');
            }
        }
        $email = strtolower(trim($d['email']));
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email=?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            fail('Email sudah wujud.');
        }
        $token = bin2hex(random_bytes(24));
        $pdo->prepare("INSERT INTO users (email,password,role,fullName,verificationStatus,isActive,token)
            VALUES (?,?,?,?,?,?,?)")
            ->execute([
                $email, password_hash($d['password'], PASSWORD_DEFAULT), 'admin',
                $d['fullName'] ?? 'Admin', 'approved', 1, $token,
            ]);
        $id = $pdo->lastInsertId();
        ok(['token' => $token, 'user' => ['id' => $id, 'email' => $email, 'role' => 'admin']]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}