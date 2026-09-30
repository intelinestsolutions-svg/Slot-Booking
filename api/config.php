<?php

define('APP_NAME', 'Sabah Buskers Community');
define('DB_DIR', dirname(__DIR__) . '/data');
define('DB_FILE', DB_DIR . '/buskers.db');
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/avatars');

$__local = __DIR__ . '/config.local.php';
if (is_file($__local)) {
    require_once $__local;
}

if (!defined('SITE_URL')) {
    define('SITE_URL', 'https://apps.sabahbuskers.my');
}

date_default_timezone_set('Asia/Kuching');

if (!defined('TOYYIBPAY_MODE')) {
    define('TOYYIBPAY_MODE', 'sandbox');
}
define('TOYYIBPAY_API', TOYYIBPAY_MODE === 'sandbox'
    ? 'https://dev.toyyibpay.com/index.php/api/'
    : 'https://toyyibpay.com/index.php/api/');
define('TOYYIBPAY_GATEWAY', TOYYIBPAY_MODE === 'sandbox'
    ? 'https://dev.toyyibpay.com/'
    : 'https://toyyibpay.com/');
if (!defined('TOYYIBPAY_USER_SECRET_KEY')) {
    define('TOYYIBPAY_USER_SECRET_KEY', 'YOUR-TOYYIBPAY-USER-SECRET-KEY');
}
if (!defined('TOYYIBPAY_CATEGORY_CODE')) {
    define('TOYYIBPAY_CATEGORY_CODE', 'YOUR-CATEGORY-CODE');
}

if (!defined('VERIFY_TOKEN')) {
    define('VERIFY_TOKEN', 'change-me-to-a-secret-passphrase');
}

if (!defined('MPK_VERIFY_KEY')) {
    define('MPK_VERIFY_KEY', '');
}

// ====== Pengesahan WhatsApp (OTP 6-digit semasa pendaftaran busker) ======
// Pendaftaran baharu wajib mengesahkan nombor WhatsApp Malaysia melalui OTP
// sebelum sesi log masuk dikeluarkan. Akaun sedia ada dikecualikan automatik.
if (!defined('WHATSAPP_TEST_MODE')) {
    define('WHATSAPP_TEST_MODE', false);  // true = log OTP ke fail, jangan hantar
}
if (!defined('WHATSAPP_TEST_LOG')) {
    define('WHATSAPP_TEST_LOG', DB_DIR . '/whatsapp-test.log');
}
// Polisi OTP: sah 10 minit, maks 5 cubaan, hantar semula selepas 60 saat.
if (!defined('OTP_TTL')) {
    define('OTP_TTL', 600);
}
if (!defined('OTP_MAX_ATTEMPTS')) {
    define('OTP_MAX_ATTEMPTS', 5);
}
if (!defined('OTP_RESEND_COOLDOWN')) {
    define('OTP_RESEND_COOLDOWN', 60);
}

// Telefon prepaid sendiri (aplikasi SMS gateway di telefon lama).
// Digunakan apabila WHATSAPP_GATEWAY = 'sms'.
if (!defined('WHATSAPP_SMS_URL')) {
    define('WHATSAPP_SMS_URL', '');
}
if (!defined('WHATSAPP_SMS_KEY')) {
    define('WHATSAPP_SMS_KEY', '');
}

ini_set('display_errors', '0');
error_reporting(E_ALL);
session_start();

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    SITE_URL,
    'http://localhost',
    'http://localhost:8000',
    'http://127.0.0.1',
    'http://127.0.0.1:8000',
    'https://localhost',
    'https://localhost:8000',
    'capacitor://localhost',
];
$originOk = $origin === ''
    || in_array(strtolower($origin), array_map('strtolower', $allowedOrigins), true)
    || str_ends_with(strtolower($origin), '.sabahbuskers.my')
    || str_ends_with(strtolower($origin), '.hostingersite.com');
header('Access-Control-Allow-Origin: ' . ($originOk && $origin !== '' ? $origin : SITE_URL));
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}