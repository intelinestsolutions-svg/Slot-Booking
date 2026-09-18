<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/toyyibpay.php';

const PREMIUM_MONTHS = 1;
const PREMIUM_PRICE = 120.00;

$action = $_GET['action'] ?? '';
$pdo = db();

function premium_active(array $user): bool
{
    if ((int)($user['isPremium'] ?? 0) !== 1) {
        return false;
    }
    $exp = (string)($user['premiumExpiresAt'] ?? '');
    return $exp === '' || $exp >= date('Y-m-d');
}

function premium_meta(PDO $pdo, array $user): array
{
    return [
        'isPremium'        => premium_active($user),
        'premiumExpiresAt' => (string)($user['premiumExpiresAt'] ?? ''),
        'price'            => PREMIUM_PRICE,
        'months'           => PREMIUM_MONTHS,
    ];
}

function confirm_premium(PDO $pdo, string $billCode): void
{
    $stmt = $pdo->prepare("SELECT * FROM premiumPurchases WHERE billCode=?");
    $stmt->execute([$billCode]);
    $p = $stmt->fetch();
    if (!$p) {
        return;
    }
    $row = $pdo->prepare("SELECT * FROM users WHERE id=?");
    $row->execute([$p['userId']]);
    $user = $row->fetch();
    if (!$user) {
        return;
    }

    $months = max(1, (int)($p['months'] ?? 1));
    $base = $user['premiumExpiresAt'] ?? '';
    $from = ($base !== '' && $base >= date('Y-m-d')) ? $base : date('Y-m-d');
    $exp = date('Y-m-d', strtotime($from . ' +' . $months . ' months'));

    $pdo->prepare("UPDATE premiumPurchases SET status='paid' WHERE id=?")->execute([$p['id']]);
    $pdo->prepare("UPDATE users SET isPremium=1, premiumExpiresAt=? WHERE id=?")->execute([$exp, $user['id']]);
    $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?, 'Keahlian Premium Diaktifkan', ?)")
        ->execute([$user['id'], "Keahlian Premium SBC aktif sehingga {$exp}. Terima kasih atas sokongan anda!"]);

    $pdo->prepare("INSERT INTO transactions (userId,bookingId,amount,billCode,txnRef,status)
        VALUES (?,NULL,?,?,?,?)")
        ->execute([$user['id'], PREMIUM_PRICE, $billCode, 'premium-' . $billCode, 'paid']);

    try {
        $msg = "⭐ KEANGGOTAAN PREMIUM AKTIF (SBC)\n"
            . "• Ahli: " . ($user['stageName'] ?? $user['fullName'] ?? $user['email']) . "\n"
            . "• Tempoh: " . $months . " bulan (sehingga " . $exp . ")\n"
            . "• Bil: " . $billCode . "\n"
            . "Keahlian premium berjaya diaktifkan.";
        send_whatsapp(whatsapp_target(), $msg);
    } catch (Throwable $e) {
        /* WhatsApp adalah pilihan */
    }
}

switch ($action) {
    case 'status':
        $user = require_user($pdo);
        ok(premium_meta($pdo, $user));
        break;

    case 'history':
        $user = require_user($pdo);
        $stmt = $pdo->prepare("SELECT * FROM premiumPurchases WHERE userId=? ORDER BY createdAt DESC LIMIT 20");
        $stmt->execute([$user['id']]);
        ok(['purchases' => $stmt->fetchAll()]);
        break;

    case 'subscribe':
        $user = require_user($pdo);
        if ($user['role'] !== 'busker') {
            fail('Hanya busker boleh melanggan keahlian premium.');
        }
        if ($user['verificationStatus'] !== 'approved') {
            fail('Akaun anda mesti diluluskan admin sebelum melanggan premium.');
        }
        if (premium_active($user)) {
            fail('Keahlian premium anda sudah aktif.');
        }

        $amountSen = (int)round(PREMIUM_PRICE * 100);
        $ref = 'PREMIUM-' . $user['id'] . '-' . date('ymdHis');
        $bill = create_toyyibpay_bill_generic(
            'Keahlian Premium SBC (1 bulan)',
            'Keahlian premium Sabah Buskers Community - tempahan slot tanpa had & badge premium.',
            $amountSen,
            $ref,
            $user,
            SITE_URL . '/?page=premium&verify=1&billCode=',
            SITE_URL . '/api/premium.php?action=callback'
        );
        if (!$bill['success']) {
            fail('Gagal mencipta bil ToyyibPay: ' . ($bill['error'] ?? 'Unknown'), 502);
        }

        $pdo->prepare("INSERT INTO premiumPurchases (userId,billCode,amount,months,status)
            VALUES (?,?,?,?,?)")
            ->execute([$user['id'], $bill['billCode'], PREMIUM_PRICE, PREMIUM_MONTHS, 'pending']);

        ok([
            'paymentUrl' => $bill['paymentUrl'],
            'billCode'   => $bill['billCode'],
        ]);
        break;

    case 'verify_return':
        $billCode = $_GET['billCode'] ?? '';
        $statusId = $_GET['status_id'] ?? '';
        if (!$billCode) {
            fail('BillCode tidak sah.');
        }
        if ($statusId !== '1') {
            $pdo->prepare("UPDATE premiumPurchases SET status='cancelled' WHERE billCode=?")->execute([$billCode]);
            ok(['status' => 'cancelled', 'message' => 'Pembayaran tidak berjaya atau dibatalkan.']);
            break;
        }
        $result = verify_toyyibpay($billCode);
        if (!$result['success'] || !isset($result['data']['status_id']) || (int)$result['data']['status_id'] !== 1) {
            $pdo->prepare("UPDATE premiumPurchases SET status='cancelled' WHERE billCode=?")->execute([$billCode]);
            ok(['status' => 'failed', 'message' => 'Pengesahan gagal. Keahlian tidak diaktifkan.']);
            break;
        }
        confirm_premium($pdo, $billCode);
        ok(['status' => 'confirmed', 'message' => 'Pembayaran berjaya! Keahlian premium anda telah diaktifkan.']);
        break;

    case 'callback':
        $d = body();
        $billCode = $d['billcode'] ?? ($_GET['billCode'] ?? '');
        $statusId = $d['status_id'] ?? ($_GET['status_id'] ?? '');
        if (!$billCode) {
            fail('BillCode tidak sah.');
        }
        if ((string)$statusId !== '1') {
            $pdo->prepare("UPDATE premiumPurchases SET status='cancelled' WHERE billCode=?")->execute([$billCode]);
            ok(['status' => 'cancelled']);
            break;
        }
        confirm_premium($pdo, $billCode);
        ok(['status' => 'confirmed']);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}