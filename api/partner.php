<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
    case 'dashboard':
        cleanup_stale_locks($pdo);
        $user = require_user($pdo);
        if ($user['role'] !== 'partner' && $user['role'] !== 'admin') {
            fail('Akses ditolak.', 403);
        }

        $today = date('Y-m-d');
        $weekEnd = date('Y-m-d', strtotime('+7 days'));

        $stmt = $pdo->prepare("SELECT s.id, s.date, s.startTime, s.endTime, s.status, s.price,
                l.name AS locationName, l.area, u.stageName, u.id AS buskerId
            FROM slots s
            JOIN locations l ON l.id = s.locationId
            LEFT JOIN bookings b ON b.slotId = s.id AND b.status IN ('pending','confirmed','completed')
            LEFT JOIN users u ON u.id = b.userId
            WHERE s.date BETWEEN ? AND ?
            ORDER BY s.date, s.startTime");
        $stmt->execute([$today, $weekEnd]);
        ok(['slots' => $stmt->fetchAll()]);
        break;

    case 'set_status':
        $user = require_user($pdo);
        if ($user['role'] !== 'partner' && $user['role'] !== 'admin') {
            fail('Akses ditolak.', 403);
        }
        $d = body();
        $slotId = (int)($d['slotId'] ?? 0);
        $status = $d['status'] ?? '';
        $allowed = ['Tersedia', 'Ditempah', 'Dibatalkan', 'Selesai'];
        if (!$slotId || !in_array($status, $allowed, true)) {
            fail('Parameter tidak sah.');
        }
        $pdo->prepare("UPDATE slots SET status=? WHERE id=?")->execute([$status, $slotId]);
        ok();
        break;

    case 'partner_registration':
        $d = body();
        foreach (['fullName', 'email', 'phone', 'password'] as $f) {
            if (empty($d[$f])) {
                fail('Sila lengkapkan butiran pendaftaran.');
            }
        }
        if (strlen($d['password']) < 6) {
            fail('Kata laluan sekurang-kurangnya 6 aksara.');
        }
        $email = strtolower(trim($d['email']));
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email=?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            fail('Email sudah didaftarkan.');
        }
        $token = bin2hex(random_bytes(24));
        $pdo->prepare("INSERT INTO users
            (email,password,role,fullName,phone,stageName,verificationStatus,isActive,token)
            VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([
                $email, password_hash($d['password'], PASSWORD_DEFAULT), 'partner',
                $d['fullName'], $d['phone'], $d['fullName'], 'approved', 1, $token,
            ]);
        $id = $pdo->lastInsertId();
        ok(['token' => $token, 'user' => [
            'id' => $id, 'email' => $email, 'role' => 'partner', 'fullName' => $d['fullName'],
        ]]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}