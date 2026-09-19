<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    $given = $_GET['token'] ?? ($_SERVER['HTTP_X_TOKEN'] ?? '');
    if (!defined('VERIFY_TOKEN') || VERIFY_TOKEN === '' || hash_equals(VERIFY_TOKEN, (string)$given) === false) {
        fail('Unauthorized.', 401);
    }
}

$pdo = db();
$now = date('Y-m-d H:i:s');
$horizon = date('Y-m-d H:i:s', time() + 3600);

$stmt = $pdo->prepare(
    "SELECT b.id AS bookingId, b.slotId, b.buskerStageName,
            COALESCE(NULLIF(u.whatsappNumber,''), u.phone, b.buskerPhone) AS targetPhone,
            s.date, s.startTime, s.endTime, l.name AS locationName
       FROM bookings b
       JOIN users u ON u.id = b.userId
       JOIN slots s ON s.id = b.slotId
       JOIN locations l ON l.id = s.locationId
      WHERE b.status = 'confirmed'
        AND s.status = 'Ditempah'
        AND b.reminderSent = 0
        AND b.reminderAttempts < 3
        AND datetime(s.date || ' ' || s.startTime) >= :now
        AND datetime(s.date || ' ' || s.startTime) <= :horizon"
);
$stmt->execute([':now' => $now, ':horizon' => $horizon]);
$due = $stmt->fetchAll();

$sent = 0;
$failed = 0;
$updated = $pdo->prepare("UPDATE bookings SET reminderSent=?, reminderSentAt=?, reminderAttempts=reminderAttempts+1 WHERE id=?");
$attempted = $pdo->prepare("UPDATE bookings SET reminderAttempts=reminderAttempts+1 WHERE id=?");

foreach ($due as $row) {
    $booking = [
        'buskerStageName' => $row['buskerStageName'],
    ];
    $slot = [
        'date'      => $row['date'],
        'startTime' => $row['startTime'],
        'endTime'   => $row['endTime'],
    ];
    $phone = normalize_whatsapp((string)$row['targetPhone'])
        ?? preg_replace('/[^0-9]/', '', (string)$row['targetPhone']);
    if ($phone === '') {
        continue;
    }
    if (send_whatsapp($phone, reminder_message($booking, $slot, $row['locationName']))) {
        $updated->execute([1, date('Y-m-d H:i:s'), $row['bookingId']]);
        $sent++;
    } else {
        $attempted->execute([$row['bookingId']]);
        $failed++;
    }
}

ok(['checked' => count($due), 'sent' => $sent, 'failed' => $failed]);