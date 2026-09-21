<?php

require_once __DIR__ . '/db.php';

function create_toyyibpay_bill(array $slot, array $user, int $slotId): array
{
    $amount = (int)round($slot['price'] * 100);
    $loc = db()->prepare("SELECT name FROM locations WHERE id=?");
    $loc->execute([$slot['locationId']]);
    $loc = $loc->fetch();

    $billName = 'Bayaran Tempahan SBC';
    $billDescription = "Tempahan slot busking: {$loc['name']} pada {$slot['date']} ({$slot['startTime']}-{$slot['endTime']})";
    $returnUrl = SITE_URL . '/?page=tempahan-saya&verify=1&billCode=';
    $callbackUrl = SITE_URL . '/api/bookings.php?action=callback';

    $params = [
        'userSecretKey'      => TOYYIBPAY_USER_SECRET_KEY,
        'categoryCode'       => TOYYIBPAY_CATEGORY_CODE,
        'billName'           => $billName,
        'billDescription'    => $billDescription,
        'billPriceSetting'   => '1',
        'billPayorInfo'      => '0',
        'billAmount'         => $amount,
        'billExternalReferenceNo' => 'SBC-' . $slotId . '-' . date('ymdHis'),
        'billTo'             => $user['fullName'] ?? $user['stageName'],
        'billEmail'          => $user['email'],
        'billPhone'          => $user['phone'],
        'billPayorName'      => $user['fullName'] ?? $user['stageName'],
        'billPayorEmail'     => $user['email'],
        'billPayerPhone'     => $user['phone'],
        'billReceiverName'   => 'BuskersSabah',
        'billPayorComment'   => '',
        'billReceiverEmail'  => 'info@sabahbuskers.my',
        'billContent'        => '',
        'billPaymentMode'    => '0',
        'billUrlSlug'        => md5('slot' . $slotId),
        'billReturnUrl'      => $returnUrl,
        'billCallbackUrl'    => $callbackUrl,
    ];

    $ch = curl_init(TOYYIBPAY_API . 'createBill');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $code < 200 || $code >= 300) {
        return ['success' => false, 'error' => "HTTP $code $err"];
    }

    $json = json_decode($resp, true);

    if (is_array($json) && isset($json['status']) && $json['status'] === 'error') {
        return ['success' => false, 'error' => 'ToyyibPay: ' . ($json['msg'] ?? 'Ralat tidak diketahui')];
    }

    $list = is_array($json) ? $json : [];
    $d = isset($list['BillCode']) ? $list : ($list[0] ?? null);
    if (!is_array($d) || empty($d['BillCode'])) {
        $raw = trim(strip_tags((string)$resp));
        if (strpos($raw, 'CATEGORY-NOT-MATCH') !== false) {
            return ['success' => false, 'error' => 'Kategori ToyyibPay tidak sah. Semak kategori yuran dalam config.'];
        }
        return ['success' => false, 'error' => 'Tiada bil daripada ToyyibPay.'];
    }

    $billCode  = $d['BillCode'];
    $paymentUrl = TOYYIBPAY_GATEWAY . $billCode;

    return ['success' => true, 'billCode' => $billCode, 'paymentUrl' => $paymentUrl, 'billId' => $d['billID'] ?? $d['BillID'] ?? ''];
}

function verify_toyyibpay(string $billCode): array
{
    $params = [
        'userSecretKey' => TOYYIBPAY_USER_SECRET_KEY,
        'billCode'      => $billCode,
    ];

    $ch = curl_init(TOYYIBPAY_API . 'getBillTransactions');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    $json = json_decode($resp, true);

    $list = is_array($json) ? $json : [];
    $item = $list[0] ?? null;
    if (!is_array($item)) {
        return ['success' => false, 'error' => 'Tiada data transaksi.'];
    }

    return ['success' => true, 'data' => $item];
}

function create_toyyibpay_bill_generic(string $billName, string $description, int $amountSen, string $ref, array $user, string $returnUrl, string $callbackUrl): array
{
    $params = [
        'userSecretKey'      => TOYYIBPAY_USER_SECRET_KEY,
        'categoryCode'       => TOYYIBPAY_CATEGORY_CODE,
        'billName'           => $billName,
        'billDescription'    => $description,
        'billPriceSetting'   => '1',
        'billPayorInfo'      => '0',
        'billAmount'         => $amountSen,
        'billExternalReferenceNo' => $ref,
        'billTo'             => $user['fullName'] ?? $user['stageName'] ?? $user['email'],
        'billEmail'          => $user['email'] ?? '',
        'billPhone'          => $user['phone'] ?? '',
        'billPayorName'      => $user['fullName'] ?? $user['stageName'] ?? $user['email'],
        'billPayorEmail'     => $user['email'] ?? '',
        'billPayerPhone'     => $user['phone'] ?? '',
        'billReceiverName'   => 'BuskersSabah',
        'billPayorComment'   => '',
        'billReceiverEmail'  => 'info@sabahbuskers.my',
        'billContent'        => '',
        'billPaymentMode'    => '0',
        'billUrlSlug'        => md5('prem' . $ref),
        'billReturnUrl'      => $returnUrl,
        'billCallbackUrl'    => $callbackUrl,
    ];

    $ch = curl_init(TOYYIBPAY_API . 'createBill');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $code < 200 || $code >= 300) {
        return ['success' => false, 'error' => "HTTP $code $err"];
    }

    $json = json_decode($resp, true);
    if (is_array($json) && isset($json['status']) && $json['status'] === 'error') {
        return ['success' => false, 'error' => 'ToyyibPay: ' . ($json['msg'] ?? 'Ralat tidak diketahui')];
    }

    $list = is_array($json) ? $json : [];
    $d = isset($list['BillCode']) ? $list : ($list[0] ?? null);
    if (!is_array($d) || empty($d['BillCode'])) {
        return ['success' => false, 'error' => 'Tiada bil daripada ToyyibPay.'];
    }

    $billCode  = $d['BillCode'];
    $paymentUrl = TOYYIBPAY_GATEWAY . $billCode;

    return ['success' => true, 'billCode' => $billCode, 'paymentUrl' => $paymentUrl, 'billId' => $d['billID'] ?? $d['BillID'] ?? ''];
}