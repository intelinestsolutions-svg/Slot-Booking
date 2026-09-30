<?php

require_once __DIR__ . '/db.php';

function send_whatsapp(string $to, string $message): bool
{
    $to = preg_replace('/[^0-9]/', '', $to);
    if (trim($to) === '') {
        return false;
    }

    // Mod ujian: log sahaja, jangan hantar ke rangkaian.
    if (defined('SMS_TEST_MODE') && SMS_TEST_MODE) {
        $log = defined('SMS_TEST_LOG') ? (string)SMS_TEST_LOG : '';
        if ($log !== '') {
            $dir = dirname($log);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            file_put_contents(
                $log,
                date('Y-m-d H:i:s') . " TO=$to MSG=" . str_replace("\n", ' | ', $message) . "\n",
                FILE_APPEND | LOCK_EX
            );
        }
        return true;
    }

    $gateway = defined('SMS_GATEWAY') ? SMS_GATEWAY : '';
    $token   = defined('SMS_TOKEN') ? SMS_TOKEN : '';
    $instance = defined('SMS_INSTANCE_ID') ? SMS_INSTANCE_ID : '';

    // Telefon prepaid sendiri — SMS Gateway for Android (sms-gate.app),
    // mod Cloud. Auth: Basic (username + password dari skrin Home aplikasi).
    if ($gateway === 'sms') {
        $url = defined('SMS_URL') ? rtrim((string)SMS_URL, '/') : 'https://api.sms-gate.app/3rdparty/v1/messages';
        $user = defined('SMS_USER') ? (string)SMS_USER : '';
        $pass = defined('SMS_PASS') ? (string)SMS_PASS : '';
        if ($user === '' || $pass === '') {
            return false;
        }
        $msisdn = '+' . ltrim($to, '+');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['phoneNumbers' => [$msisdn], 'textMessage' => ['text' => $message]]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_USERPWD => $user . ':' . $pass,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 20,
        ]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        // 202 = diterima untuk penghantaran (rujuk docs sms-gate.app).
        return !$err && $resp !== false && in_array($code, [200, 201, 202], true);
    }

    if ($gateway === '' || $token === '' || $instance === '' || trim($to) === '') {
        return false;
    }

    if ($gateway === 'chatapi') {
        $url = "https://api.chat-api.com/instance{$instance}/sendMessage";
        $params = ['token' => $token, 'chatId' => $to . '@c.us', 'body' => $message];
    } elseif ($gateway === 'evolution') {
        $base = defined('SMS_BASE') ? SMS_BASE : '';
        if ($base === '') {
            return false;
        }
        $url = rtrim($base, '/') . '/message/sendText/' . $instance;
        $headers = ['Content-Type: application/json', 'apikey: ' . $token];
        $payload = trim($to) === '' ? null : json_encode([
            'number'      => $to,
            'textMessage' => $message,
        ]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $resp = curl_exec($ch);
        $err  = curl_error($ch);
        curl_close($ch);
        return !$err && $resp !== false;
    } else {
        return false;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 15,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);

    return !$err && $resp !== false;
}

function whatsapp_target(): string
{
    $to = defined('SMS_TO') ? SMS_TO : '';
    return preg_replace('/[^0-9]/', '', $to);
}

function normalize_whatsapp(string $v): ?string
{
    $d = preg_replace('/[^0-9]/', '', $v);
    if ($d === '') {
        return null;
    }
    if (str_starts_with($d, '0')) {
        $d = '60' . substr($d, 1);
    }
    // Mudah alih Malaysia: 60 + 1 + 8-9 digit (cth: 60123456789, 601112345678).
    if (!preg_match('/^601\d{8,9}$/', $d)) {
        return null;
    }
    return $d;
}

function alert_paid_booking(array $slot, array $user, string $locationName, array $booking): bool
{
    $msg = "💰 PEMBAYARAN BERJAYA — SLOT SAH (SBC)\n"
        . "• Busker: " . ($user['stageName'] ?? $user['fullName'] ?? '-') . "\n"
        . "• Telefon: " . ($user['phone'] ?? '-') . "\n"
        . "• Lokasi: " . $locationName . "\n"
        . "• Tarikh: " . $slot['date'] . "\n"
        . "• Masa: " . $slot['startTime'] . "–" . $slot['endTime'] . "\n"
        . "• Bayaran: RM" . number_format((float)$booking['amount'], 2) . " (LUNAS)\n"
        . "• Bil: " . $booking['billCode'] . "\n"
        . "Tempahan sah. Sila semak di Panel Admin.";

    return send_whatsapp(whatsapp_target(), $msg);
}

function notify_busker_swap(string $phone, array $slot, string $locationName, string $stageName): bool
{
    $msg = "🔄 SLOT ANDA DITETAPKAN OLEH ADMIN (SBC)\n"
        . "• Busker: " . $stageName . "\n"
        . "• Lokasi: " . $locationName . "\n"
        . "• Tarikh: " . $slot['date'] . "\n"
        . "• Masa: " . $slot['startTime'] . "–" . $slot['endTime'] . "\n"
        . "Sila semak tempahan anda di aplikasi SBC.";

    return send_whatsapp(preg_replace('/[^0-9]/', '', $phone), $msg);
}

function reminder_message(array $booking, array $slot, string $locationName): string
{
    return "⏰ PERINGATAN TEMPAHAN SLOT (SBC)\n"
        . "• Busker: " . $booking['buskerStageName'] . "\n"
        . "• Lokasi: " . $locationName . "\n"
        . "• Tarikh: " . $slot['date'] . "\n"
        . "• Masa: " . $slot['startTime'] . "–" . $slot['endTime'] . "\n\n"
        . "Slot anda bermula dalam 1 jam. Sila berada di lokasi tepat pada masa.";
}