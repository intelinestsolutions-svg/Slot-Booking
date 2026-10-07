<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/toyyibpay.php';
require_once __DIR__ . '/mailer.php';

$action = $_GET['action'] ?? '';
$pdo = db();

function admin_only(PDO $pdo): array
{
    $user = require_user($pdo);
    if (!is_super_admin($pdo, $user)) {
        fail('Akses ditolak.', 403);
    }
    return $user;
}

/** Emel pentadbir penuh (satu-satunya yang boleh memantau SEMUA lokasi). */
function super_admin_email(): string
{
    $e = defined('DEFAULT_ADMIN_EMAIL') ? trim((string)DEFAULT_ADMIN_EMAIL) : '';
    return $e !== '' ? $e : 'admin@sabahbuskers.my';
}

/** HANYA akaun admin@sabahbuskers.my layak memantau semua lokasi. */
function is_super_admin(PDO $pdo, array $user): bool
{
    if (($user['role'] ?? '') !== 'admin') {
        return false;
    }
    return strtolower(trim((string)($user['email'] ?? ''))) === strtolower(super_admin_email());
}

/* ---- Skop lokasi: admin penuh vs pentadbir "spot" (role 'venue') ---- */

/** Terima pentadbir penuh (admin@sabahbuskers.my) ATAU pentadbir spot. */
function staff_only(PDO $pdo): array
{
    $user = require_user($pdo);
    $ok = $user['role'] === 'venue'
        || ($user['role'] === 'admin' && is_super_admin($pdo, $user));
    if (!$ok) {
        fail('Akses ditolak.', 403);
    }
    return $user;
}

/** Bolehkah pengguna ini mentadbir lokasi berkenaan? */
function can_manage_location(PDO $pdo, array $user, int $locationId): bool
{
    if (is_super_admin($pdo, $user)) {
        return true;
    }
    if ($user['role'] === 'venue') {
        $stmt = $pdo->prepare("SELECT id FROM locations WHERE id=? AND adminUserId=?");
        $stmt->execute([$locationId, $user['id']]);
        return (bool)$stmt->fetch();
    }
    return false;
}

/** Senarai ID lokasi milik satu pentadbir spot. */
function venue_location_ids(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare("SELECT id FROM locations WHERE adminUserId=?");
    $stmt->execute([$userId]);
    return array_column($stmt->fetchAll(), 'id');
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
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email=? AND role IN ('admin','venue')");
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
        issue_session($pdo, $id, $token);
        ok(['token' => $token, 'user' => ['id' => $id, 'email' => $email, 'role' => 'admin']]);
        break;

    case 'slots_schedule':
        admin_only($pdo);
        $today = date('Y-m-d');
        $weekEnd = date('Y-m-d', strtotime('+7 days'));
        $stmt = $pdo->prepare("SELECT s.id, s.date, s.startTime, s.endTime, s.status, s.price,
                l.name AS locationName, l.area, u.stageName, u.id AS buskerId
            FROM slots s
            JOIN locations l ON l.id = s.locationId
            LEFT JOIN bookings b ON b.slotId = s.id AND b.status IN ('pending','approved','confirmed','completed')
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

        // Notifikasi dalam aplikasi sudah dihantar di atas ("Gantian Slot"),
        // jadi tiada saluran luaran diperlukan di sini.
        ok();
        break;

    case 'bookings_pending':
        $me = staff_only($pdo);
        // Admin penuh lihat semua; pentadbir spot hanya lokasi sendiri.
        $where = "b.status IN ('pending','approved')";
        if ($me['role'] === 'venue') {
            $locIds = venue_location_ids($pdo, (int)$me['id']);
            if (!$locIds) {
                ok(['bookings' => []]);
                break;
            }
            $where .= ' AND b.locationId IN (' . implode(',', array_map('intval', $locIds)) . ')';
        }
        $stmt = $pdo->prepare("SELECT b.*, u.fullName, u.stageName, u.email AS buskerEmail, u.phone AS buskerPhone,
                s.date AS slotDate, s.startTime, s.endTime, s.status AS slotStatus,
                l.name AS locationName, l.area, l.adminUserId
            FROM bookings b
            JOIN users u ON u.id = b.userId
            JOIN slots s ON s.id = b.slotId
            LEFT JOIN locations l ON l.id = b.locationId
            WHERE $where
            ORDER BY b.createdAt ASC");
        $stmt->execute();
        ok(['bookings' => $stmt->fetchAll()]);
        break;

    case 'approve_booking':
        $me = staff_only($pdo);
        $d = body();
        $bookingId = (int)($d['bookingId'] ?? 0);
        if (!$bookingId) {
            fail('ID tempahan tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT b.*, u.fullName, u.stageName, u.email, u.phone,
                s.date, s.startTime, s.endTime, s.price, s.locationId, l.name AS locationName
            FROM bookings b
            JOIN users u ON u.id = b.userId
            JOIN slots s ON s.id = b.slotId
            LEFT JOIN locations l ON l.id = b.locationId
            WHERE b.id=?");
        $stmt->execute([$bookingId]);
        $b = $stmt->fetch();
        if (!$b) {
            fail('Tempahan tidak dijumpai.');
        }
        if (!can_manage_location($pdo, $me, (int)$b['locationId'])) {
            fail('Akses ditolak: anda tidak mentadbir lokasi slot ini.', 403);
        }
        if ($b['status'] !== 'pending') {
            fail('Tempahan ini bukan dalam status menunggu kelulusan.');
        }
        // Elak perlumbaan: satu slot hanya boleh ada SATU kelulusan/bayaran.
        $taken = $pdo->prepare("SELECT b.id FROM bookings b WHERE b.slotId=? AND b.status IN ('approved','confirmed','completed') AND b.id<>? LIMIT 1");
        $taken->execute([$b['slotId'], $bookingId]);
        if ($taken->fetch()) {
            fail('Slot ini telah diluluskan kepada permohonan lain.');
        }

        // Cipta bil ToyyibPay DI SINI (selepas kelulusan). Pembayar = busker.
        $slot = [
            'locationId' => (int)$b['locationId'],
            'date'       => $b['date'],
            'startTime'  => $b['startTime'],
            'endTime'    => $b['endTime'],
            'price'      => (float)$b['price'],
        ];
        $payer = [
            'fullName' => $b['fullName'],
            'stageName' => $b['stageName'],
            'email'    => $b['email'],
            'phone'    => $b['phone'],
        ];
        try {
            $bill = create_toyyibpay_bill($slot, $payer, (int)$b['slotId']);
        } catch (Throwable $e) {
            $bill = ['success' => false, 'error' => 'Tidak dapat berhubung dengan ToyyibPay: ' . $e->getMessage()];
        }
        if (!$bill['success']) {
            // Tempahan kekal 'pending' — admin boleh cuba lulus semula.
            fail('Gagal mencipta bil ToyyibPay: ' . ($bill['error'] ?? 'Unknown'), 502);
        }

        $pdo->beginTransaction();
        $otherRows = [];
        try {
            // Pemohon diluluskan + slot dikunci ('Pra-tempah') menunggu bayaran.
            $pdo->prepare("UPDATE bookings SET status='approved', billCode=? WHERE id=?")->execute([$bill['billCode'], $bookingId]);
            $pdo->prepare("UPDATE slots SET status='Pra-tempah', bookedBy=?, lockedAt=?, billCode=? WHERE id=?")
                ->execute([$b['userId'], date('Y-m-d H:i:s'), $bill['billCode'], $b['slotId']]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Tempahan Diluluskan', ?)")
                ->execute([$b['userId'], "Tempahan slot {$b['date']} {$b['startTime']} diluluskan. Sila lengkapkan pembayaran melalui emel yang dihantar."]);
            // AUTO-TOLAK permohonan lain bagi slot yang sama.
            $others = $pdo->prepare("SELECT * FROM bookings WHERE slotId=? AND status='pending' AND id<>?");
            $others->execute([$b['slotId'], $bookingId]);
            $otherRows = $others->fetchAll();
            foreach ($otherRows as $o) {
                $pdo->prepare("UPDATE bookings SET status='rejected' WHERE id=?")->execute([$o['id']]);
                $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Tempahan Ditolak', ?)")
                    ->execute([$o['userId'], "Slot {$b['date']} {$b['startTime']} telah diluluskan kepada pemohon lain. Tempahan anda ditolak otomatik."]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }

        // Emel selepas commit — kegagalan emel TIDAK membatalkan kelulusan.
        $sent = booking_approval_email($b, (string)$bill['billCode']);
        $rejectErrs = '';
        if (!empty($otherRows)) {
            $uStmt = $pdo->prepare("SELECT email, stageName FROM users WHERE id=?");
            foreach ($otherRows as $o) {
                $uStmt->execute([$o['userId']]);
                $ou = $uStmt->fetch();
                $r2 = booking_reject_email([
                    'email'        => $ou['email'] ?? '',
                    'stageName'    => $ou['stageName'] ?? '',
                    'locationName' => $b['locationName'] ?? '',
                    'date'         => $b['date'],
                    'startTime'    => $b['startTime'],
                    'endTime'      => $b['endTime'],
                ]);
                if (empty($r2['success'])) {
                    $rejectErrs = ($rejectErrs === '' ? '' : $rejectErrs . '; ') . ($r2['error'] ?? 'emel gagal');
                }
            }
        }

        ok([
            'status' => 'approved',
            'paymentUrl' => $bill['paymentUrl'],
            'emailSent' => !empty($sent['success']),
            'emailError' => $sent['error'] ?? '',
            'autoRejected' => count($otherRows),
            'rejectEmailError' => $rejectErrs,
        ]);
        break;

    case 'reject_booking':
        $me = staff_only($pdo);
        $d = body();
        $bookingId = (int)($d['bookingId'] ?? 0);
        if (!$bookingId) {
            fail('ID tempahan tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT b.*, u.fullName, u.stageName, u.email, u.phone,
                s.date, s.startTime, s.endTime, s.price, s.locationId, l.name AS locationName
            FROM bookings b
            JOIN users u ON u.id = b.userId
            JOIN slots s ON s.id = b.slotId
            LEFT JOIN locations l ON l.id = b.locationId
            WHERE b.id=?");
        $stmt->execute([$bookingId]);
        $b = $stmt->fetch();
        if (!$b) {
            fail('Tempahan tidak dijumpai.');
        }
        if (!can_manage_location($pdo, $me, (int)$b['locationId'])) {
            fail('Akses ditolak: anda tidak mentadbir lokasi slot ini.', 403);
        }
        if ($b['status'] !== 'pending' && $b['status'] !== 'approved') {
            fail('Tempahan ini tidak boleh ditolak.');
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE bookings SET status='rejected' WHERE id=?")->execute([$bookingId]);
            // Lepaskan slot HANYA jika tempahan ini yang memegang kunci.
            $pdo->prepare("UPDATE slots SET status='Tersedia', bookedBy=NULL, lockedAt=NULL, billCode=NULL WHERE id=? AND bookedBy=?")
                ->execute([$b['slotId'], $b['userId']]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Tempahan Ditolak', ?)")
                ->execute([$b['userId'], "Tempahan slot {$b['date']} {$b['startTime']} tidak diluluskan."]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }

        $sent = booking_reject_email($b);

        ok([
            'status' => 'rejected',
            'emailSent' => !empty($sent['success']),
            'emailError' => $sent['error'] ?? '',
        ]);
        break;

    case 'venue_locations':
        admin_only($pdo);
        // Senarai lokasi + pentadbir spot yang ditugaskan (pengurusan).
        $stmt = $pdo->query("SELECT l.id, l.name, l.area, l.tier, l.isActive, l.adminUserId,
                u.email AS adminEmail, u.fullName AS adminName
            FROM locations l
            LEFT JOIN users u ON u.id = l.adminUserId
            ORDER BY l.tier, l.name COLLATE NOCASE");
        ok(['locations' => $stmt->fetchAll()]);
        break;

    case 'create_venue':
        admin_only($pdo);
        $d = body();
        foreach (['email', 'locationId'] as $f) {
            if (empty($d[$f])) {
                fail('Email dan lokasi diperlukan.');
            }
        }
        $email = strtolower(trim($d['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('Email tidak sah.');
        }
        $locationId = (int)$d['locationId'];
        $locStmt = $pdo->prepare("SELECT id, name FROM locations WHERE id=? AND isActive=1");
        $locStmt->execute([$locationId]);
        $loc = $locStmt->fetch();
        if (!$loc) {
            fail('Lokasi tidak dijumpai.');
        }
        // Elak tulis ganti senyap: lokasi yang sudah ada pentadbir LAIN.
        $held = $pdo->prepare("SELECT u.email FROM locations l LEFT JOIN users u ON u.id=l.adminUserId WHERE l.id=? AND l.adminUserId IS NOT NULL");
        $held->execute([$locationId]);
        $heldBy = $held->fetchColumn();
        if ($heldBy) {
            fail('Lokasi "' . $loc['name'] . '" sudah ditugaskan kepada ' . $heldBy . '. Guna "Ubah" untuk pindahkan pentadbir dahulu.');
        }
        // Emel yang SAMA dibenarkan: orang yang sama boleh mentadbir
        // BANYAK spot. Akaun venue sedia ada diguna semula (kata laluan
        // & nama kekal), hanya tugasan lokasi ditambah.
        $ex = $pdo->prepare("SELECT id, fullName, role FROM users WHERE email=? AND role IN ('admin','venue')");
        $ex->execute([$email]);
        $existing = $ex->fetch();
        if ($existing && $existing['role'] === 'admin') {
            fail('Email sedia ada sebagai pentadbir global (bukan spot).');
        }
        $reused = $existing !== false;
        $fullName = $reused ? $existing['fullName'] : trim((string)($d['fullName'] ?? ''));
        if (!$reused) {
            if (empty($d['password']) || strlen((string)$d['password']) < 6) {
                fail('Kata laluan sekurang-kurangnya 6 aksara (akaun baharu).');
            }
            if ($fullName === '') {
                fail('Nama penuh diperlukan (akaun baharu).');
            }
        }
        $pdo->beginTransaction();
        try {
            if ($reused) {
                $vid = (int)$existing['id'];
            } else {
                $pdo->prepare("INSERT INTO users (email,password,role,fullName,verificationStatus,isActive,token)
                    VALUES (?,?,?,?,?,?,?)")->execute([
                    $email, password_hash($d['password'], PASSWORD_DEFAULT), 'venue',
                    $fullName, 'approved', 1, bin2hex(random_bytes(24)),
                ]);
                $vid = $pdo->lastInsertId();
            }
            $pdo->prepare("UPDATE locations SET adminUserId=? WHERE id=?")->execute([$vid, $locationId]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }
        ok([
            'venue' => ['id' => $vid, 'email' => $email, 'fullName' => $fullName, 'role' => 'venue'],
            'location' => ['id' => $locationId, 'name' => $loc['name']],
            'reused' => $reused,
        ]);
        break;

    case 'update_venue':
        admin_only($pdo);
        $d = body();
        $vid = (int)($d['venueId'] ?? 0);
        if (!$vid) {
            fail('ID pentadbir spot diperlukan.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id=? AND role='venue'");
        $stmt->execute([$vid]);
        $v = $stmt->fetch();
        if (!$v) {
            fail('Pentadbir spot tidak dijumpai.');
        }
        $sets = [];
        $args = [];
        if (!empty($d['password'])) {
            if (strlen((string)$d['password']) < 6) {
                fail('Kata laluan sekurang-kurangnya 6 aksara.');
            }
            $sets[] = 'password=?';
            $args[] = password_hash((string)$d['password'], PASSWORD_DEFAULT);
        }
        if (isset($d['fullName']) && trim((string)$d['fullName']) !== '') {
            $sets[] = 'fullName=?';
            $args[] = trim((string)$d['fullName']);
        }
        if ($sets) {
            $args[] = $vid;
            $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($args);
        }
        // Pilihan: pindahkan tugasan ke lokasi lain (pentadbir spot boleh tukar).
        $loc = null;
        if (!empty($d['locationId'])) {
            $locId = (int)$d['locationId'];
            $locStmt = $pdo->prepare("SELECT id, name FROM locations WHERE id=? AND isActive=1");
            $locStmt->execute([$locId]);
            $loc = $locStmt->fetch();
            if (!$loc) {
                fail('Lokasi tidak dijumpai.');
            }
            // Elak tulis ganti senyap: lokasi yang diduduki pentadbir LAIN.
            $heldStmt = $pdo->prepare("SELECT u.email FROM locations l LEFT JOIN users u ON u.id=l.adminUserId WHERE l.id=? AND l.adminUserId IS NOT NULL AND l.adminUserId<>?");
            $heldStmt->execute([$locId, $vid]);
            $heldBy = $heldStmt->fetchColumn();
            if ($heldBy) {
                fail('Lokasi itu sudah ditugaskan kepada ' . $heldBy . '. Pindahkan pentadbir sedia ada dahulu.');
            }
            $pdo->beginTransaction();
            try {
                $pdo->prepare("UPDATE locations SET adminUserId=NULL WHERE adminUserId=?")->execute([$vid]);
                $pdo->prepare("UPDATE locations SET adminUserId=? WHERE id=?")->execute([$vid, $locId]);
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                fail($e->getMessage(), 500);
            }
        }
        $fresh = $pdo->prepare("SELECT id, email, fullName, role FROM users WHERE id=?");
        $fresh->execute([$vid]);
        ok(['venue' => $fresh->fetch(), 'location' => $loc]);
        break;

    case 'location_create':
        // Super admin menambah spot baharu DAN menentukan harga & masa slot.
        admin_only($pdo);
        $d = body();
        $name = trim((string)($d['name'] ?? ''));
        $area = trim((string)($d['area'] ?? ''));
        if ($name === '' || $area === '') {
            fail('Nama dan kawasan spot diperlukan.');
        }
        $price = (float)($d['price'] ?? 0);
        if ($price <= 0) {
            fail('Harga slot mesti lebih daripada 0.');
        }
        $startTime = (string)($d['startTime'] ?? '20:00');
        $endTime = (string)($d['endTime'] ?? '22:00');
        if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
            fail('Masa slot tidak sah (HH:MM).');
        }
        $daysList = array_map('trim', explode(',', (string)($d['days'] ?? 'Fri,Sat,Sun')));
        $validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        foreach ($daysList as $dd) {
            if (!in_array($dd, $validDays, true)) {
                fail('Hari tidak sah: ' . $dd);
            }
        }
        $days = implode(',', $daysList);
        $tier = in_array((string)($d['tier'] ?? ''), ['Hotspot', 'Coldspot'], true) ? (string)$d['tier'] : 'Hotspot';
        $base = preg_replace('/-+/', '-', trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-'));
        $slug = $base !== '' ? $base : 'spot';
        $slugCheck = $pdo->prepare("SELECT id FROM locations WHERE slug=?");
        $n = 2;
        $slugCheck->execute([$slug]);
        while ($slugCheck->fetch()) {
            $slug = $base . '-' . $n++;
            $slugCheck->execute([$slug]);
        }
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO locations (slug,name,area,city,state,pbt,tier,lat,lng,description,isActive)
                VALUES (?,?,?,?,?,?,?,?,?,?,1)")->execute([
                $slug, $name, $area, (string)($d['city'] ?? 'Kota Kinabalu'), (string)($d['state'] ?? 'Sabah'),
                (string)($d['pbt'] ?? ''), $tier, (float)($d['lat'] ?? 0), (float)($d['lng'] ?? 0),
                trim((string)($d['description'] ?? '')),
            ]);
            $locId = $pdo->lastInsertId();
            $pdo->prepare("INSERT INTO slotTemplates (locationId,days,startTime,endTime,price,sessionLabel,isActive)
                VALUES (?,?,?,?,?,?,1)")->execute([
                $locId, $days, $startTime, $endTime, $price, (string)($d['sessionLabel'] ?? ''),
            ]);
            ensure_slots($pdo, $locId, 30);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }
        ok([
            'location' => ['id' => $locId, 'name' => $name, 'slug' => $slug, 'tier' => $tier, 'isActive' => 1],
            'template' => ['days' => $days, 'startTime' => $startTime, 'endTime' => $endTime, 'price' => $price],
        ]);
        break;

    case 'location_remove':
        // Buang spot = nyahaktifkan (isActive=0) + lepaskan pentadbir spot.
        // Sejarah tempahan/slot kekal untuk audit. Hanya super admin.
        admin_only($pdo);
        $d = body();
        $locId = (int)($d['locationId'] ?? 0);
        $stmt = $pdo->prepare("SELECT id, name FROM locations WHERE id=?");
        $stmt->execute([$locId]);
        $loc = $stmt->fetch();
        if (!$loc) {
            fail('Lokasi tidak dijumpai.');
        }
        $act = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE locationId=? AND status IN ('pending','approved','confirmed')");
        $act->execute([$locId]);
        if ((int)$act->fetchColumn() > 0) {
            fail('Spot tidak boleh dibuang: masih ada tempahan aktif.');
        }
        $pdo->prepare("UPDATE locations SET isActive=0, adminUserId=NULL WHERE id=?")->execute([$locId]);
        // Slot akan datang yang belum dikunci dilepaskan (Tiada lagi penerimaan).
        $pdo->prepare("UPDATE slots SET status='Tersedia', bookedBy=NULL, lockedAt=NULL, billCode=NULL
            WHERE locationId=? AND date>=? AND status IN ('Tersedia','Pra-tempah')")->execute([$locId, date('Y-m-d')]);
        ok(['location' => ['id' => $locId, 'name' => $loc['name'], 'isActive' => 0]]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}