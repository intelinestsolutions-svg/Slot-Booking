<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

switch ($action) {
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

        $appId = 'APP-' . strtoupper(substr(md5(uniqid('', true)), 0, 8));

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO users
                (email, password, role, fullName, icNumber, phone, state, city, address, postcode,
                 stageName, genre, description, instagram, tiktok, verificationStatus, isActive, token)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $token = bin2hex(random_bytes(24));
            $stmt->execute([
                $email,
                password_hash($d['password'], PASSWORD_DEFAULT),
                'busker',
                $d['fullName'],
                preg_replace('/[^0-9]/', '', $d['icNumber']),
                $d['phone'],
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
                $token,
            ]);
            $userId = $pdo->lastInsertId();

            $pdo->prepare("INSERT INTO buskerApplications
                (userId, appId, fullName, icNumber, phone, email, state, city, address, postcode,
                 stageName, genre, description, instagram, tiktok, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")->execute([
                $userId, $appId, $d['fullName'], preg_replace('/[^0-9]/', '', $d['icNumber']),
                $d['phone'], $email, $d['state'], $d['city'], $d['address'], $d['postcode'] ?? '',
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

        ok(['appId' => $appId, 'token' => $token, 'user' => public_user($pdo, $userId)]);
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
        }

        $token = bin2hex(random_bytes(24));
        $pdo->prepare("UPDATE users SET token = ? WHERE id = ?")->execute([$token, $user['id']]);

        if ($user['role'] === 'busker' && $user['verificationStatus'] !== 'approved') {
            ok(['token' => $token, 'user' => public_user($pdo, $user['id']), 'pending' => true]);
            break;
        }

        ok(['token' => $token, 'user' => public_user($pdo, $user['id'])]);
        break;

    case 'logout':
        $user = current_user($pdo);
        if ($user) {
            $pdo->prepare("UPDATE users SET token = NULL WHERE id = ?")->execute([$user['id']]);
        }
        ok();
        break;

    case 'me':
        $user = require_user($pdo);
        ok(['user' => public_user_full($pdo, $user['id'])]);
        break;

    case 'update_profile':
        $user = require_user($pdo);
        $d = body();
        $allowed = ['fullName', 'phone', 'city', 'address', 'postcode', 'stageName', 'genre', 'description', 'instagram', 'tiktok', 'language'];
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
        $user = require_user($pdo);
        $d = body();
        if (!password_verify($d['current'] ?? '', $user['password'])) {
            fail('Kata laluan semasa salah.');
        }
        if (strlen($d['new'] ?? '') < 6) {
            fail('Kata laluan baru sekurang-kurangnya 6 aksara.');
        }
        $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")
            ->execute([password_hash($d['new'], PASSWORD_DEFAULT), $user['id']]);
        ok();
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
    $stmt = $pdo->prepare("SELECT id,email,role,fullName,phone,stageName,genre,city,state,verificationStatus,isActive FROM users WHERE id=?");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: [];
}

function public_user_full(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare("SELECT id,email,role,fullName,icNumber,phone,state,city,address,postcode,
        stageName,genre,description,instagram,tiktok,verificationStatus,isActive,isPremium,isOku,language,avatar,createdAt
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