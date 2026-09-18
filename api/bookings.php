<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/toyyibpay.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
    case 'book':
        cleanup_stale_locks($pdo);
        $user = require_user($pdo);
        if ($user['role'] !== 'busker') {
            fail('Hanya busker boleh menempah slot.');
        }
        if ($user['verificationStatus'] !== 'approved') {
            fail('Akaun belum diluluskan admin. Sila tunggu kelulusan.');
        }

        $d = body();
        $slotId = (int)($d['slotId'] ?? 0);
        if (!$slotId) {
            fail('Slot tidak sah.');
        }

        $slot = $pdo->prepare("SELECT * FROM slots WHERE id = ?");
        $slot->execute([$slotId]);
        $slot = $slot->fetch();
        if (!$slot) {
            fail('Slot tidak dijumpai.');
        }
        if ($slot['status'] !== 'Tersedia') {
            fail('Slot ini sudah ditempah.');
        }

        $lockTs = time();
        $lockExpiry = $lockTs + 600;

        $pdo->beginTransaction();
        try {
            $row = $pdo->prepare("SELECT status FROM slots WHERE id = ? AND status = 'Tersedia'");
            $row->execute([$slotId]);
            if (!$row->fetch()) {
                $pdo->rollBack();
                fail('Slot ini baru sahaja ditempah orang lain.');
            }

            $pdo->prepare("UPDATE slots SET status = 'Pra-tempah', bookedBy = ?, lockedAt = ? WHERE id = ?")
                ->execute([$user['id'], date('Y-m-d H:i:s', $lockTs), $slotId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }

        try {
            $bill = create_toyyibpay_bill($slot, $user, $slotId);
        } catch (Throwable $e) {
            $bill = ['success' => false, 'error' => 'Tidak dapat berhubung dengan ToyyibPay: ' . $e->getMessage()];
        }
        if (!$bill['success']) {
            $pdo->prepare("UPDATE slots SET status='Tersedia', bookedBy=NULL, lockedAt=NULL WHERE id=?")->execute([$slotId]);
            fail('Gagal mencipta bil ToyyibPay: ' . ($bill['error'] ?? 'Unknown'), 502);
        }

        $pdo->prepare("UPDATE slots SET billCode = ? WHERE id = ?")->execute([$bill['billCode'], $slotId]);

        $pdo->prepare("INSERT INTO bookings (slotId,userId,locationId,status,billCode,amount,buskerStageName,buskerPhone)
            VALUES (?,?,?,?,?,?,?,?)")->execute([
            $slotId, $user['id'], $slot['locationId'], 'pending',
            $bill['billCode'], $slot['price'], $user['stageName'], $user['phone'],
        ]);
        $bookingId = $pdo->lastInsertId();

        ok([
            'bookingId' => $bookingId,
            'paymentUrl' => $bill['paymentUrl'],
            'billCode' => $bill['billCode'],
        ]);
        break;

    case 'my_bookings':
        cleanup_stale_locks($pdo);
        $user = require_user($pdo);
        $stmt = $pdo->prepare("SELECT b.*, l.name AS locationName, l.area, l.tier, s.date AS slotDate, s.startTime, s.endTime
            FROM bookings b
            JOIN locations l ON l.id = b.locationId
            JOIN slots s ON s.id = b.slotId
            WHERE b.userId = ?
            ORDER BY s.date DESC, s.startTime DESC");
        $stmt->execute([$user['id']]);
        ok(['bookings' => $stmt->fetchAll()]);
        break;

    case 'cancel':
        $user = require_user($pdo);
        $d = body();
        $bookingId = (int)($d['bookingId'] ?? 0);
        if (!$bookingId) {
            fail('Permohonan tidak sah.');
        }

        $stmt = $pdo->prepare("SELECT b.*, s.date, s.startTime FROM bookings b JOIN slots s ON s.id=b.slotId WHERE b.id=? AND b.userId=?");
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) {
            fail('Tempahan tidak dijumpai.');
        }
        if ($booking['status'] !== 'pending') {
            fail('Hanya tempahan yang belum dibayar boleh dibatalkan.');
        }

        $slotStart = new DateTime($booking['date'] . ' ' . $booking['startTime'], new DateTimeZone('Asia/Kuching'));
        if ($slotStart <= new DateTime('now', new DateTimeZone('Asia/Kuching'))) {
            fail('Tidak boleh batalkan selepas slot bermula.');
        }

        $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE id=?")->execute([$bookingId]);
        $pdo->prepare("UPDATE slots SET status='Tersedia', bookedBy=NULL, lockedAt=NULL, billCode=NULL WHERE id=?")
            ->execute([$booking['slotId']]);

        ok();
        break;

    case 'confirm_attendance':
        $user = require_user($pdo);
        $d = body();
        $bookingId = (int)($d['bookingId'] ?? 0);
        $photoUrl = $d['photoUrl'] ?? '';

        $stmt = $pdo->prepare("SELECT b.*, s.date FROM bookings b JOIN slots s ON s.id=b.slotId WHERE b.id=? AND b.userId=?");
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) {
            fail('Tempahan tidak dijumpai.');
        }
        if ($booking['status'] !== 'confirmed') {
            fail('Slot perlu disahkan pembayaran terlebih dahulu.');
        }

        $slotDate = $booking['date'];
        $today = date('Y-m-d');
        if ($slotDate !== $today) {
            fail('Anda hanya boleh mengesahkan kehadiran pada hari slot.');
        }

        $pdo->prepare("UPDATE bookings SET status='completed', attendancePhotoUrl=?, attendanceSubmittedAt=datetime('now') WHERE id=?")
            ->execute([$photoUrl, $bookingId]);
        $pdo->prepare("UPDATE slots SET status='Selesai' WHERE id=?")->execute([$booking['slotId']]);

        $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Slot Disahkan', 'Kehadiran anda untuk slot telah direkodkan.')")
            ->execute([$user['id']]);

        ok();
        break;

    case 'public_schedule':
        $slug = $_GET['slug'] ?? '';
        if (!$slug) {
            fail('Location slug tidak diberikan.');
        }
        $daysAhead = (int)($_GET['days'] ?? 7);

        $locStmt = $pdo->prepare("SELECT id,name,area,city,image FROM locations WHERE slug=? AND isActive=1");
        $locStmt->execute([$slug]);
        $loc = $locStmt->fetch();
        if (!$loc) {
            fail('Lokasi tidak dijumpai.');
        }

        $dateStart = date('Y-m-d');
        $dateEnd = date('Y-m-d', strtotime("+$daysAhead days"));
        ensure_slots($pdo, $loc['id'], $daysAhead);

        $stmt = $pdo->prepare("SELECT s.*, b.status AS bookingStatus, u.stageName
            FROM slots s
            LEFT JOIN bookings b ON b.slotId = s.id AND b.status IN ('pending','confirmed','completed')
            LEFT JOIN users u ON u.id = b.userId
            WHERE s.locationId = ? AND s.date BETWEEN ? AND ?
            ORDER BY s.date, s.startTime");
        $stmt->execute([$loc['id'], $dateStart, $dateEnd]);

        ok(['location' => $loc, 'slots' => $stmt->fetchAll()]);
        break;

    case 'verify_return':
        $billCode = $_GET['billCode'] ?? '';
        $statusId = $_GET['status_id'] ?? '';
        $slotId = (int)($_GET['slotId'] ?? 0);

        if (!$billCode) {
            fail('BillCode tidak sah.');
        }
        if ($statusId !== '1') {
            $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE billCode=?")->execute([$billCode]);
            $booking = $pdo->prepare("SELECT slotId FROM bookings WHERE billCode=?");
            $booking->execute([$billCode]);
            $b = $booking->fetch();
            if ($b) {
                $pdo->prepare("UPDATE slots SET status='Tersedia',bookedBy=NULL,lockedAt=NULL,billCode=NULL WHERE id=?")->execute([$b['slotId']]);
            }
            ok(['status' => 'cancelled', 'message' => 'Pembayaran tidak berjaya atau dibatalkan.']);
            break;
        }

        $result = verify_toyyibpay($billCode);
        if (!$result['success'] || !isset($result['data']['status_id']) || $result['data']['status_id'] !== 1) {
            $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE billCode=?")->execute([$billCode]);
            ok(['status' => 'failed', 'message' => 'Pengesahan gagal. Slot dibatalkan.']);
            break;
        }

        $bookingStmt = $pdo->prepare("SELECT * FROM bookings WHERE billCode=?");
        $bookingStmt->execute([$billCode]);
        $b = $bookingStmt->fetch();
        if ($b && $b['status'] !== 'confirmed') {
            $pdo->prepare("UPDATE bookings SET status='confirmed', txnRef=? WHERE billCode=?")
                ->execute(['txn-' . $billCode, $billCode]);
            $pdo->prepare("UPDATE slots SET status='Ditempah' WHERE id=?")->execute([$b['slotId']]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Pembayaran Berjaya', 'Slot anda telah disahkan! Sila hadir pada waktu yang ditetapkan.')")
                ->execute([$b['userId']]);
            record_transaction($pdo, $b);
            try { alert_paid_booking_ctx($pdo, $b); } catch (Throwable $e) {}
        }

        ok(['status' => 'confirmed', 'message' => 'Pembayaran berjaya! Slot telah disahkan.']);
        break;

    case 'pay':
        $user = require_user($pdo);
        $d = body();
        $bookingId = (int)($d['bookingId'] ?? 0);
        if (!$bookingId) {
            fail('Tempahan tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT b.*, s.date, s.startTime, s.endTime, s.status AS slotStatus, s.price, s.id AS slotId
            FROM bookings b JOIN slots s ON s.id=b.slotId WHERE b.id=? AND b.userId=?");
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) {
            fail('Tempahan tidak dijumpai.');
        }
        if ($booking['status'] !== 'pending') {
            fail('Tempahan ini sudah disahkan atau dibatalkan.');
        }
        if ($booking['slotStatus'] !== 'Pra-tempah') {
            fail('Slot tidak lagi dikunci untuk anda. Sila tempah semula.');
        }
        $slot = [
            'locationId' => $booking['locationId'],
            'date'       => $booking['date'],
            'startTime'  => $booking['startTime'],
            'endTime'    => $booking['endTime'],
            'price'      => (float)$booking['price'],
        ];
        try {
            $bill = create_toyyibpay_bill($slot, $user, (int)$booking['slotId']);
        } catch (Throwable $e) {
            $bill = ['success' => false, 'error' => 'Tidak dapat berhubung dengan ToyyibPay: ' . $e->getMessage()];
        }
        if (!$bill['success']) {
            fail('Gagal mencipta bil ToyyibPay: ' . ($bill['error'] ?? 'Unknown'), 502);
        }
        $pdo->prepare("UPDATE bookings SET billCode=? WHERE id=?")->execute([$bill['billCode'], $bookingId]);
        $pdo->prepare("UPDATE slots SET billCode=? WHERE id=?")->execute([$bill['billCode'], $booking['slotId']]);
        ok([
            'bookingId' => $bookingId,
            'paymentUrl' => $bill['paymentUrl'],
            'billCode' => $bill['billCode'],
        ]);
        break;

    case 'callback':
        $d = body();
        $billCode = $d['billcode'] ?? ($_GET['billCode'] ?? '');
        $statusId = $d['status_id'] ?? ($_GET['status_id'] ?? '');
        if (!$billCode) {
            fail('BillCode tidak sah.');
        }
        $stmt = $pdo->prepare("SELECT * FROM bookings WHERE billCode=?");
        $stmt->execute([$billCode]);
        $booking = $stmt->fetch();
        if (!$booking) {
            fail('Tempahan tidak dijumpai.');
        }
        if ((string)$statusId !== '1') {
            $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE id=?")->execute([$booking['id']]);
            $pdo->prepare("UPDATE slots SET status='Tersedia',bookedBy=NULL,lockedAt=NULL,billCode=NULL WHERE id=?")
                ->execute([$booking['slotId']]);
            ok(['status' => 'cancelled']);
            break;
        }
        if ($booking['status'] !== 'confirmed') {
            $pdo->prepare("UPDATE bookings SET status='confirmed', txnRef=? WHERE id=?")
                ->execute(['txn-' . $billCode, $booking['id']]);
            $pdo->prepare("UPDATE slots SET status='Ditempah' WHERE id=?")->execute([$booking['slotId']]);
            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Pembayaran Berjaya', 'Slot anda telah disahkan! Sila hadir pada waktu yang ditetapkan.')")
                ->execute([$booking['userId']]);
            record_transaction($pdo, $booking);
            try { alert_paid_booking_ctx($pdo, $booking); } catch (Throwable $e) {}
        }
        ok(['status' => 'confirmed']);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}

function alert_paid_booking_ctx(PDO $pdo, array $booking): bool
{
    include_once __DIR__ . '/whatsapp.php';
    $stmt = $pdo->prepare("SELECT s.date, s.startTime, s.endTime, l.name AS locationName
        FROM slots s JOIN locations l ON l.id = s.locationId WHERE s.id=?");
    $stmt->execute([$booking['slotId']]);
    $info = $stmt->fetch();
    if (!$info) {
        return false;
    }
    $slot = ['date' => $info['date'], 'startTime' => $info['startTime'], 'endTime' => $info['endTime']];
    $user = [
        'stageName' => $booking['buskerStageName'] ?? null,
        'fullName'  => $booking['buskerStageName'] ?? null,
        'phone'     => $booking['buskerPhone'] ?? null,
    ];
    return alert_paid_booking($slot, $user, $info['locationName'] ?? '', $booking);
}

function record_transaction(PDO $pdo, array $booking): void
{
    $txnRef = $booking['txnRef'] ?? ('txn-' . $booking['billCode']);
    $pdo->prepare("INSERT INTO transactions (userId,bookingId,amount,billCode,txnRef,status)
        VALUES (?,?,?,?,?,?)")
        ->execute([
            $booking['userId'], $booking['id'], (float)$booking['amount'],
            $booking['billCode'], $txnRef, 'paid',
        ]);
}