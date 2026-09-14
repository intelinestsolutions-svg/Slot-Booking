<?php

define('APP_NAME', 'SabahBuskers');
define('DB_DIR', dirname(__DIR__) . '/data');
define('DB_FILE', DB_DIR . '/buskers.db');

define('SITE_URL', 'https://sbcbooking.my');

date_default_timezone_set('Asia/Kuching');

define('TOYYIBPAY_MODE', 'sandbox');
define('TOYYIBPAY_API', TOYYIBPAY_MODE === 'sandbox'
    ? 'https://dev.toyyibpay.com/index.php/api/'
    : 'https://toyyibpay.com/index.php/api/');
define('TOYYIBPAY_GATEWAY', TOYYIBPAY_MODE === 'sandbox'
    ? 'https://dev.toyyibpay.com/'
    : 'https://toyyibpay.com/');
define('TOYYIBPAY_USER_SECRET_KEY', 'YOUR-TOYYIBPAY-USER-SECRET-KEY');
define('TOYYIBPAY_CATEGORY_CODE', 'YOUR-CATEGORY-CODE');

define('VERIFY_TOKEN', 'change-me-to-a-secret-passphrase');

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
];
$originOk = $origin === ''
    || in_array(strtolower($origin), array_map('strtolower', $allowedOrigins), true)
    || str_ends_with(strtolower($origin), '.sbcbooking.my');
header('Access-Control-Allow-Origin: ' . ($originOk && $origin !== '' ? $origin : SITE_URL));
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}