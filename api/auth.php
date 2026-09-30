<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/otp.php';
require_once __DIR__ . '/otp.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
    case 'request_register_otp':
        // LANGKAH 1 Permohonan Busker Baru: hantar OTP ke nombor yang diberi.
        // Tiada akaun dicipta di sini — akaun hanya wujud selepas OTP disahkan.
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $phone = trim((string)($d['phone'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('Email tidak sah.');
        }
        $waPhone = normalize_whatsapp($phone);
        if ($waPhone === null) {
            fail('Nombor telefon tidak sah. Gunakan nombor Malaysia, cth: 012-3456789.');
        }
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            fail('Email ini sudah didaftarkan. Sila log masuk.', 409);
        }
        $dupPhone = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
        $dupPhone->execute([$waPhone]);
        if ($dupPhone->fetch()) {
            fail('Nombor telefon ini sudah digunakan pada akaun lain.', 409);
        }
        if (!otp_configured()) {
            fail('Perkhidmatan SMS belum disediakan. Sila hubungi admin.', 502);
        }
        $pdo->exec("DELETE FROM busker_proofs WHERE (proofExpires IS NOT NULL AND proofExpires < '" . time() . "')");
        $stmt = $pdo->prepare("SELECT * FROM busker_proofs WHERE email = ?");
        $stmt->execute([$email]);
        $pend = $stmt->fetch();
        if (($wait = otp_cooldown_wait($pend['otpSentAt'] ?? null)) > 0 && $pend) {
            json_out(['success' => false, 'error' => "Sila tunggu $wait saat sebelum meminta kod baharu.", 'retryAfter' => $wait], 429);
        }
        $otp = (string)random_int(100000, 999999);
        $expires = time() + (defined('OTP_TTL') ? OTP_TTL : 600);
        $pdo->prepare("INSERT INTO busker_proofs (email, phone, otpHash, otpExpires, otpAttempts, otpSentAt, proofHash, proofExpires)
            VALUES (?,?,?,?,?, ?,NULL,NULL)
            ON CONFLICT(email) DO UPDATE SET phone=excluded.phone, otpHash=excluded.otpHash,
            otpExpires=excluded.otpExpires, otpAttempts=0, otpSentAt=excluded.otpSentAt,
            proofHash=NULL, proofExpires=NULL")
            ->execute([$email, $waPhone, password_hash($otp, PASSWORD_DEFAULT), (string)$expires, 0, (string)time()]);
        $mins = (int)((defined('OTP_TTL') ? OTP_TTL : 600) / 60);
        $msg = "🔐 Kod pengesahan SBC: $otp\nKod ini luput dalam $mins minit. Jangan kongsi dengan sesiapa.";
        if (!send_whatsapp($waPhone, $msg)) {
            fail('Gagal menghantar kod SMS. Sila cuba hantar semula.', 502);
        }
        ok([
            'email' => $email,
            'phoneMasked' => otp_mask($waPhone),
            'message' => 'Kod pengesahan 6-digit telah dihantar melalui SMS. Sahkan kod dahulu, kemudian lengkapkan permohonan.',
        ]);
        break;

    case 'verify_register_otp':
        // LANGKAH 2: sahkan OTP, terima token bukti untuk langkah 3 (hantar permohonan).
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $code = (string)($d['otp'] ?? ($d['code'] ?? ''));
        if ($email === '' || $code === '') {
            fail('Sila isi email dan kod pengesahan 6-digit.');
        }
        $stmt = $pdo->prepare("SELECT * FROM busker_proofs WHERE email = ?");
        $stmt->execute([$email]);
        $pend = $stmt->fetch();
        if (!$pend || empty($pend['otpHash']) || empty($pend['otpExpires'])) {
            fail('Tiada kod aktif. Sila tekan "Hantar Kod" dahulu.', 410);
        }
        $tmpUser = ['id' => 0, 'phoneOtpHash' => $pend['otpHash'], 'phoneOtpExpires' => $pend['otpExpires'], 'phoneOtpAttempts' => $pend['otpAttempts']];
        $chk = otp_check($pdo, $tmpUser, $code);
        if (!$chk['success']) {
            if (($chk['code'] ?? 400) === 401) {
                $pdo->prepare("UPDATE busker_proofs SET otpAttempts = otpAttempts + 1 WHERE email = ?")->execute([$email]);
            }
            fail($chk['error'], $chk['code'] ?? 400);
        }
        $proof = bin2hex(random_bytes(32));
        $proofTtl = defined('PROOF_TTL') ? PROOF_TTL : 1800;
        $pdo->prepare("UPDATE busker_proofs SET proofHash = ?, proofExpires = ?,
            otpHash = NULL, otpExpires = NULL, otpAttempts = 0 WHERE email = ?")
            ->execute([hash('sha256', $proof), (string)(time() + $proofTtl), $email]);
        ok([
            'email' => $email,
            'phoneMasked' => otp_mask((string)$pend['phone']),
            'proof' => $proof,
            'message' => 'Nombor disahkan. Lengkapkan permohonan anda.',
        ]);
        break;

    case 'register':
        $d = body();
        $required = ['fullName', 'icNumber', 'phone', 'email', 'state', 'city', 'address', 'stageName', 'genre', 'password'];
        foreach ($required as $f) {
            if (empty($d[$f])) {
                fail('Sila lengkapkan ruangan bertanda *.');
            }
        }
        if (!preg_match('/^[0-9]{6}-?[0-9]{2}-?[0-9]{4}$/', $d['icNumber'])) {
            fail('Nombor IC tidak sah.');
        }
        if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
            fail('Email tidak sah.');
        }
        if (strlen($d['password']) < 6) {
            fail('Kata laluan sekurang-kurangnya 6 aksara.');
        }

        $email = strtolower(trim($d['email']));
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            fail('Email ini sudah didaftarkan.');
        }

        $whatsapp = normalize_whatsapp((string)($d['whatsappNumber'] ?? ''));
        if (($d['whatsappNumber'] ?? '') !== '' && $whatsapp === null) {
            fail('Nombor WhatsApp tidak sah.');
        }

        // Nombor telefon pendaftaran MESTI nombor mudah alih Malaysia yang sah
        // kerana kod pengesahan OTP dihantar ke nombor ini.
        $waPhone = normalize_whatsapp((string)$d['phone']);
        if ($waPhone === null) {
            fail('Nombor telefon tidak sah. Gunakan nombor telefon Malaysia, cth: 012-3456789.');
        }

        $dupPhone = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
        $dupPhone->execute([$waPhone]);
        if ($dupPhone->fetch()) {
            fail('Nombor telefon ini sudah digunakan pada akaun lain.', 409);
        }

        // WAJIB: bukti OTP yang sah untuk pasangan email+nombor ini.
        // Permohonan hanya boleh dihantar SELEPAS kod disahkan.
        $proof = (string)($d['proof'] ?? '');
        if ($proof === '') {
            fail('Sila sahkan nombor telefon anda dengan kod SMS dahulu (Langkah 1-2).', 403);
        }
        $proofRow = $pdo->prepare("SELECT * FROM busker_proofs WHERE email = ?");
        $proofRow->execute([$email]);
        $pend = $proofRow->fetch();
        if (!$pend || empty($pend['proofHash']) || empty($pend['proofExpires'])
            || !hash_equals((string)$pend['proofHash'], hash('sha256', $proof))
            || otp_ts($pend['proofExpires']) < time()
            || (string)$pend['phone'] !== $waPhone) {
            fail('Bukti pengesahan tidak sah atau telah luput. Sila minta kod baharu dan sahkan semula.', 403);
        }

        $appId = 'APP-' . strtoupper(substr(md5(uniqid('', true)), 0, 8));

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO users
                (email, password, role, fullName, icNumber, phone, state, city, address, postcode,
                 stageName, genre, description, instagram, tiktok, verificationStatus, isActive, token, whatsappNumber, phoneVerified)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)");
            // Nombor telah disahkan melalui OTP — sesi dikeluarkan serta-merta.
            $token = bin2hex(random_bytes(24));
            $stmt->execute([
                $email,
                password_hash($d['password'], PASSWORD_DEFAULT),
                'busker',
                $d['fullName'],
                preg_replace('/[^0-9]/', '', $d['icNumber']),
                $waPhone,
                $d['state'],
                $d['city'],
                $d['address'],
                $d['postcode'] ?? '',
                $d['stageName'],
                $d['genre'],
                $d['description'] ?? '',
                $d['instagram'] ?? '',
                $d['tiktok'] ?? '',
                'pending',
                0,
                null,
                $whatsapp,
            ]);
            $userId = $pdo->lastInsertId();

            $pdo->prepare("INSERT INTO buskerApplications
                (userId, appId, fullName, icNumber, phone, email, state, city, address, postcode,
                 stageName, genre, description, instagram, tiktok, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")->execute([
                $userId, $appId, $d['fullName'], preg_replace('/[^0-9]/', '', $d['icNumber']),
                $waPhone, $email, $d['state'], $d['city'], $d['address'], $d['postcode'] ?? '',
                $d['stageName'], $d['genre'], $d['description'] ?? '', $d['instagram'] ?? '', $d['tiktok'] ?? '',
                'pending',
            ]);

            $pdo->prepare("INSERT INTO notifications (userId,title,body) VALUES (?,'Permohonan diterima','Mohon semak tempahan anda selepas kelulusan admin.')")
                ->execute([$userId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            fail($e->getMessage(), 500);
        }

        // Nombor sudah disahkan (proof) — tiada OTP kedua. Sesi dikeluarkan
        // serta-merta; akaun menunggu kelulusan admin seperti biasa.
        $pdo->prepare("DELETE FROM busker_proofs WHERE email = ?")->execute([$email]);
        $token = bin2hex(random_bytes(24));
        issue_session($pdo, (int)$userId, $token);
        ok([
            'appId' => $appId,
            'token' => $token,
            'user' => public_user($pdo, (int)$userId),
            'message' => 'Nombor disahkan. Permohonan diterima — akaun aktif selepas kelulusan admin.',
        ]);
        break;

    case 'verify_phone':
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $code = (string)($d['otp'] ?? ($d['code'] ?? ''));
        if ($email === '' || $code === '') {
            fail('Sila isi email dan kod pengesahan 6-digit.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) {
            fail('Akaun tidak dijumpai.', 404);
        }
        if ((int)($user['phoneVerified'] ?? 0) === 1) {
            $token = bin2hex(random_bytes(24));
            issue_session($pdo, (int)$user['id'], $token);
            $appRow = $pdo->prepare("SELECT appId FROM buskerApplications WHERE userId = ? ORDER BY id DESC LIMIT 1");
            $appRow->execute([$user['id']]);
            $app = $appRow->fetch();
            ok(['token' => $token, 'user' => public_user($pdo, (int)$user['id']), 'appId' => $app['appId'] ?? null]);
            break;
        }
        $chk = otp_check($pdo, $user, $code);
        if (!$chk['success']) {
            fail($chk['error'], $chk['code'] ?? 400);
        }
        $token = bin2hex(random_bytes(24));
        $pdo->prepare("UPDATE users SET phoneVerified = 1, phoneOtpHash = NULL, phoneOtpExpires = NULL, phoneOtpAttempts = 0 WHERE id = ?")
            ->execute([$user['id']]);
        issue_session($pdo, (int)$user['id'], $token);
        $appRow = $pdo->prepare("SELECT appId FROM buskerApplications WHERE userId = ? ORDER BY id DESC LIMIT 1");
        $appRow->execute([$user['id']]);
        $app = $appRow->fetch();
        ok(['token' => $token, 'user' => public_user($pdo, (int)$user['id']), 'appId' => $app['appId'] ?? null]);
        break;

    case 'resend_otp':
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        if ($email === '') {
            fail('Sila isi email.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) {
            fail('Akaun tidak dijumpai.', 404);
        }
        if ((int)($user['phoneVerified'] ?? 0) === 1) {
            fail('Nombor anda telah disahkan. Sila log masuk.', 409);
        }
        if (($wait = otp_cooldown_wait($user['phoneOtpSentAt'] ?? null)) > 0) {
            json_out(['success' => false, 'error' => "Sila tunggu $wait saat sebelum meminta kod baharu.", 'retryAfter' => $wait], 429);
        }
        $sent = otp_issue($pdo, (int)$user['id'], (string)$user['phone']);
        if (!$sent['success']) {
            fail($sent['error'], 502);
        }
        ok(['email' => $email, 'phoneMasked' => otp_mask((string)$user['phone']), 'message' => 'Kod pengesahan baharu telah dihantar melalui SMS.']);
        break;

    case 'forgot_password':
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('Sila isi email yang sah.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user && !empty($user['phone'])) {
            if (otp_cooldown_wait($user['phoneOtpSentAt'] ?? null) <= 0) {
                otp_issue($pdo, (int)$user['id'], (string)$user['phone']);
            }
            ok([
                'email' => $email,
                'phoneMasked' => otp_mask((string)$user['phone']),
                'message' => 'Jika email ini berdaftar, kod tetapan semula telah dihantar melalui SMS.',
            ]);
            break;
        }
        ok(['message' => 'Jika email ini berdaftar, kod tetapan semula telah dihantar melalui SMS.']);
        break;

    case 'reset_password':
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $code = (string)($d['otp'] ?? ($d['code'] ?? ''));
        $new = (string)($d['new'] ?? '');
        if ($email === '' || $code === '') {
            fail('Sila isi email dan kod pengesahan 6-digit.');
        }
        if (strlen($new) < 6) {
            fail('Kata laluan baharu sekurang-kurangnya 6 aksara.');
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) {
            fail('Kod pengesahan salah atau telah luput.', 401);
        }
        $chk = otp_check($pdo, $user, $code);
        if (!$chk['success']) {
            fail($chk['error'], $chk['code'] ?? 400);
        }
        // OTP membuktikan pemilikan nombor — selesaikan pengesahan sekali gus,
        // tukar kata laluan dan tamatkan semua sesi sedia ada.
        $pdo->prepare("UPDATE users SET password = ?, phoneVerified = 1, token = NULL,
            phoneOtpHash = NULL, phoneOtpExpires = NULL, phoneOtpAttempts = 0 WHERE id = ?")
            ->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
        $pdo->prepare("DELETE FROM sessions WHERE userId = ?")->execute([$user['id']]);
        ok(['message' => 'Kata laluan berjaya ditukar. Sila log masuk dengan kata laluan baharu.']);
        break;

    case 'login':
        $d = body();
        $email = strtolower(trim($d['email'] ?? ''));
        $password = $d['password'] ?? '';
        $role = $d['role'] ?? 'busker';

        if ($role !== 'busker') {
            $user = login_admin($pdo, $email, $password, $role);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            if (!$user || !$user['password'] || !password_verify($password, $user['password'])) {
                fail('Email atau kata laluan salah.', 401);
            }
            if ((int)($user['phoneVerified'] ?? 0) !== 1) {
                json_out(['success' => false, 'error' => 'Sila sahkan nombor telefon anda dahulu.', 'needPhoneVerify' => true, 'email' => $user['email'], 'phoneMasked' => otp_mask((string)$user['phone'])], 403);
            }
        }

        $token = bin2hex(random_bytes(24));
        issue_session($pdo, (int)$user['id'], $token);

        if ($user['role'] === 'busker' && $user['verificationStatus'] !== 'approved') {
            ok(['token' => $token, 'user' => public_user($pdo, $user['id']), 'pending' => true]);
            break;
        }

        ok(['token' => $token, 'user' => public_user($pdo, $user['id'])]);
        break;

    case 'logout':
        $token = bearer_token();
        if ($token !== '') {
            $pdo->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
        }
        ok();
        break;

    case 'mpk_verify':
        // DITAMATKAN 2026-10-01: Marketplace mempunyai akaun sendiri
        // (daftar/log masuk di marketplace.sabahbuskers.my sahaja).
        // Laluan pengesahan silang ini dikekalkan supaya pemanggil lama
        // menerima mesej yang jelas, bukan "action tidak dikenali".
        fail('Integrasi SSO marketplace telah ditamatkan. Pendaftaran & log masuk Marketplace hanya di marketplace.sabahbuskers.my.', 410);
        break;

    case 'me':
        $user = require_user($pdo);
        ok(['user' => public_user_full($pdo, $user['id'])]);
        break;

    case 'update_profile':
        $user = require_user($pdo);
        $d = body();
        if (array_key_exists('whatsappNumber', $d)) {
            $raw = (string)$d['whatsappNumber'];
            if ($raw === '') {
                $d['whatsappNumber'] = '';
            } else {
                $wx = normalize_whatsapp($raw);
                if ($wx === null) {
                    fail('Nombor WhatsApp tidak sah.');
                }
                $d['whatsappNumber'] = $wx;
            }
        }
        $allowed = ['fullName', 'phone', 'whatsappNumber', 'city', 'address', 'postcode', 'stageName', 'genre', 'description', 'instagram', 'tiktok', 'language'];
        $set = [];
        $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $d)) {
                $set[] = "$f = ?";
                $vals[] = $d[$f];
            }
        }
        if ($set) {
            $vals[] = $user['id'];
            $pdo->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        }
        ok(['user' => public_user_full($pdo, $user['id'])]);
        break;

    case 'change_password':
        // Keselamatan: mesti lulus KEDUA-DUA — kata laluan semasa + OTP SMS segar.
        $user = require_user($pdo);
        $d = body();
        $chk = otp_check($pdo, $user, (string)($d['otp'] ?? ''));
        if (!$chk['success']) {
            $msg = $chk['code'] === 410
                ? 'Tiada kod aktif atau kod telah luput. Sila tekan "Hantar Kod" dahulu.'
                : $chk['error'];
            fail($msg, $chk['code'] ?? 400);
        }
        if (!password_verify($d['current'] ?? '', $user['password'])) {
            fail('Kata laluan semasa salah.');
        }
        if (strlen($d['new'] ?? '') < 6) {
            fail('Kata laluan baru sekurang-kurangnya 6 aksara.');
        }
        $pdo->prepare("UPDATE users SET password = ?,
            phoneOtpHash = NULL, phoneOtpExpires = NULL, phoneOtpAttempts = 0 WHERE id = ?")
            ->execute([password_hash($d['new'], PASSWORD_DEFAULT), $user['id']]);
        $pdo->prepare("DELETE FROM sessions WHERE userId = ?")->execute([$user['id']]);
        $token = bin2hex(random_bytes(24));
        issue_session($pdo, (int)$user['id'], $token);
        ok(['token' => $token, 'user' => public_user($pdo, (int)$user['id'])]);
        break;

    case 'request_password_otp':
        // Hantar OTP segar ke nombor telefon yang telah disahkan (untuk pertukaran kata laluan).
        $user = require_user($pdo);
        if (empty($user['phone'])) {
            fail('Tiada nombor telefon pada akaun anda.', 403);
        }
        if (($wait = otp_cooldown_wait($user['phoneOtpSentAt'] ?? null)) > 0) {
            json_out(['success' => false, 'error' => "Sila tunggu $wait saat sebelum meminta kod baharu.", 'retryAfter' => $wait], 429);
        }
        $sent = otp_issue($pdo, (int)$user['id'], (string)$user['phone']);
        if (!$sent['success']) {
            fail($sent['error'], 502);
        }
        ok(['phoneMasked' => otp_mask((string)$user['phone']), 'message' => 'Kod pengesahan telah dihantar melalui SMS.']);
        break;

    case 'upload_avatar':
        $user = require_user($pdo);
        if (empty($_FILES['avatar']) || ($_FILES['avatar']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            fail('Sila pilih fail gambar dahulu.');
        }
        $file = $_FILES['avatar'];
        $size = (int)$file['size'];
        if ($size >= 2 * 1024 * 1024) {
            fail('Gambar mestilah kurang daripada 2MB.');
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if ($mime !== 'image/jpeg') {
            fail('Hanya gambar JPEG dibenarkan.');
        }
        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0775, true);
        }
        $name = 'avatar-' . $user['id'] . '-' . substr(bin2hex(random_bytes(6)), 0, 10) . '.jpg';
        $dest = UPLOAD_DIR . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            fail('Gagal menyimpan gambar.', 500);
        }
        $url = '/uploads/avatars/' . $name;
        $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?")->execute([$url, $user['id']]);
        ok(['avatar' => $url]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}

function public_user(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare("SELECT id,email,role,fullName,phone,stageName,genre,city,state,verificationStatus,isActive,phoneVerified FROM users WHERE id=?");
    $stmt->execute([$id]);
    $u = $stmt->fetch() ?: [];
    if ($u) {
        $u['phoneVerified'] = (int)($u['phoneVerified'] ?? 0);
    }
    return $u;
}

function public_user_full(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare("SELECT id,email,role,fullName,icNumber,phone,whatsappNumber,state,city,address,postcode,
        stageName,genre,description,instagram,tiktok,verificationStatus,isActive,isPremium,isOku,language,avatar,createdAt,premiumExpiresAt
        FROM users WHERE id=?");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: [];
}

function login_admin(PDO $pdo, string $email, string $password, string $role): array
{
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND role = ?");
    $stmt->execute([$email, $role]);
    $user = $stmt->fetch();
    if (!$user || !$user['password'] || !password_verify($password, $user['password'])) {
        fail('Email atau kata laluan salah.', 401);
    }
    return $user;
}