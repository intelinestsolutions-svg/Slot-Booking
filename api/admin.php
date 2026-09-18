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

    case 'set_premium':
        admin_only($pdo);
        $d = body();
        $userId = (int)($d['userId'] ?? 0);
        $months = (int)($d['months'] ?? 0);
        if (!$userId) {
            fail('Parameter tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
        $stmt->execute([$userId]);
        $target = $stmt->fetch();
        if (!$target) {
            fail('Pengguna tidak dijumpai.');
        }
        if ($months <= 0) {
            $pdo->prepare("UPDATE users SET isPremium=0, premiumExpiresAt=NULL WHERE id=?")->execute([$userId]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Keahlian Premium Ditamatkan', 'Keahlian premium anda telah ditamatkan oleh admin.')")
                ->execute([$userId]);
            ok(['isPremium' => false]);
            break;
        }
        $base = ($target['premiumExpiresAt'] ?? '') >= date('Y-m-d')
            ? $target['premiumExpiresAt']
            : date('Y-m-d');
        $exp = date('Y-m-d', strtotime($base . ' +' . $months . ' months'));
        $pdo->prepare("UPDATE users SET isPremium=1, premiumExpiresAt=? WHERE id=?")->execute([$exp, $userId]);
        $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Keahlian Premium Diaktifkan', ?)")
            ->execute([$userId, "Keahlian premium anda telah diaktifkan sehingga {$exp}."]);
        ok(['isPremium' => true, 'premiumExpiresAt' => $exp]);
        break;

    case 'slots_schedule':
        admin_only($pdo);
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

    case 'slot_status':
        admin_only($pdo);
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

    case 'asset_cleanup':
        admin_only($pdo);
        $path = __DIR__ . '/partner.php';
        $existed = is_file($path);
        $deleted = $existed ? @unlink($path) : false;
        ok(['existed' => $existed, 'deleted' => (bool)$deleted]);
        break;

    case 'buskers':
        admin_only($pdo);
        $stmt = $pdo->query("SELECT id, stageName, fullName, phone, email
            FROM users WHERE role='busker' AND verificationStatus='approved' AND isActive=1
            ORDER BY stageName COLLATE NOCASE");
        ok(['buskers' => $stmt->fetchAll()]);
        break;

    case 'assign_busker':
        admin_only($pdo);
        $d = body();
        $slotId = (int)($d['slotId'] ?? 0);
        $buskerId = (int)($d['buskerId'] ?? 0);
        if (!$slotId || !$buskerId) {
            fail('Parameter tidak sah.');
        }

        $slotStmt = $pdo->prepare("SELECT * FROM slots WHERE id=?");
        $slotStmt->execute([$slotId]);
        $slot = $slotStmt->fetch();
        if (!$slot) {
            fail('Slot tidak dijumpai.');
        }
        if ($slot['status'] === 'Tersedia') {
            fail('Slot ini masih terbuka — tiada busker untuk diganti.');
        }

        $buskerStmt = $pdo->prepare("SELECT * FROM users WHERE id=? AND role='busker' AND verificationStatus='approved'");
        $buskerStmt->execute([$buskerId]);
        $busker = $buskerStmt->fetch();
        if (!$busker) {
            fail('Busker sasaran tidak sah atau belum diluluskan.');
        }

        $pdo->beginTransaction();
        try {
            $bookStmt = $pdo->prepare(
                "SELECT b.id, b.userId FROM bookings b
                 WHERE b.slotId=? AND b.status IN ('pending','confirmed','completed')
                 ORDER BY b.id DESC LIMIT 1");
            $bookStmt->execute([$slotId]);
            $book = $bookStmt->fetch();

            if ($book) {
                $oldUserId = (int)$book['userId'];
                $pdo->prepare(
                    "UPDATE bookings SET userId=?, buskerStageName=?, buskerPhone=? WHERE id=?")
                    ->execute([$buskerId, $busker['stageName'], $busker['phone'], $book['id']]);

                $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Gantian Slot', ?)")
                    ->execute([$buskerId, "Anda ditetapkan kepada slot {$slot['date']} {$slot['startTime']}. Sila semak tempahan anda."]);
                if ($oldUserId && $oldUserId !== $buskerId) {
                    $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Slot Diganti', ?)")
                        ->execute([$oldUserId, "Slot {$slot['date']} {$slot['startTime']} telah digantikan oleh admin."]);
                }
            } else {
                $pdo->prepare(
                    "INSERT INTO bookings (slotId,userId,locationId,status,amount,buskerStageName,buskerPhone)
                     VALUES (?,?,?,?,?,?,?)")
                    ->execute([
                        $slotId, $buskerId, $slot['locationId'],
                        $slot['status'] === 'Ditempah' ? 'confirmed' : 'pending',
                        $slot['price'], $busker['stageName'], $busker['phone'],
                    ]);
                $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Gantian Slot', ?)")
                    ->execute([$buskerId, "Anda ditetapkan kepada slot {$slot['date']} {$slot['startTime']}."]);
            }

            $pdo->prepare("UPDATE slots SET bookedBy=? WHERE id=?")->execute([$buskerId, $slotId]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }

        try {
            require_once __DIR__ . '/whatsapp.php';
            $locStmt = $pdo->prepare("SELECT name FROM locations WHERE id=?");
            $locStmt->execute([$slot['locationId']]);
            $locName = $locStmt->fetch()['name'] ?? '';
            notify_busker_swap($busker['phone'], $slot, $locName, $busker['stageName']);
        } catch (Throwable $e) {
            /* WhatsApp adalah pilihan — jangan gagalkan pertukaran */
        }
        ok();
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}