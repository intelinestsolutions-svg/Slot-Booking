<?php

require_once __DIR__ . '/db.php';

function send_whatsapp(string $to, string $message): bool
{
    $gateway = defined('WHATSAPP_GATEWAY') ? WHATSAPP_GATEWAY : '';
    $token   = defined('WHATSAPP_TOKEN') ? WHATSAPP_TOKEN : '';
    $instance = defined('WHATSAPP_INSTANCE_ID') ? WHATSAPP_INSTANCE_ID : '';

    if ($gateway === '' || $token === '' || $instance === '' || trim($to) === '') {
        return false;
    }

    if ($gateway === 'ultramsg') {
        $url = "https://api.ultramsg.com/{$instance}/messages/chat";
        $params = ['token' => $token, 'to' => $to, 'body' => $message];
    } elseif ($gateway === 'chatapi') {
        $url = "https://api.chat-api.com/instance{$instance}/sendMessage";
        $params = ['token' => $token, 'chatId' => $to . '@c.us', 'body' => $message];
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
    $to = defined('WHATSAPP_TO') ? WHATSAPP_TO : '';
    return preg_replace('/[^0-9]/', '', $to);
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