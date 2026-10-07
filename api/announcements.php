<?php

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$pdo = db();

/** Pengumuman hanya boleh diterbitkan oleh super admin (admin@sabahbuskers.my). */
function announcements_super(PDO $pdo): array
{
    $user = require_user($pdo);
    if (($user['role'] ?? '') !== 'admin') {
        fail('Akses ditolak.', 403);
    }
    $expected = defined('DEFAULT_ADMIN_EMAIL') ? trim((string)DEFAULT_ADMIN_EMAIL) : 'admin@sabahbuskers.my';
    if (strtolower(trim((string)($user['email'] ?? ''))) !== strtolower($expected)) {
        fail('Akses ditolak.', 403);
    }
    return $user;
}

switch ($action) {
    case 'list':
        // Awam (tiada token diperlukan): pengumuman aktif terkini untuk banner aplikasi.
        $stmt = $pdo->query("SELECT id, title, body, createdAt FROM announcements
            WHERE isActive=1 ORDER BY createdAt DESC, id DESC LIMIT 5");
        ok(['announcements' => $stmt->fetchAll()]);
        break;

    case 'list_all':
        announcements_super($pdo);
        $stmt = $pdo->query("SELECT a.*, u.fullName AS author
            FROM announcements a LEFT JOIN users u ON u.id=a.createdBy
            ORDER BY createdAt DESC, id DESC LIMIT 100");
        ok(['announcements' => $stmt->fetchAll()]);
        break;

    case 'create':
        $user = announcements_super($pdo);
        $d = body();
        $title = trim((string)($d['title'] ?? ''));
        $body = trim((string)($d['body'] ?? ''));
        if ($title === '' || $body === '') {
            fail('Tajuk dan mesej diperlukan.');
        }
        if (strlen($title) > 80) {
            fail('Tajuk terlalu panjang (maks 80 huruf).');
        }
        if (strlen($body) > 800) {
            fail('Mesej terlalu panjang (maks 800 huruf).');
        }
        $pdo->prepare("INSERT INTO announcements (title, body, isActive, createdBy) VALUES (?,?,1,?)")
            ->execute([$title, $body, $user['id']]);
        ok(['announcement' => ['id' => (int)$pdo->lastInsertId(), 'title' => $title, 'body' => $body, 'isActive' => 1]]);
        break;

    case 'deactivate':
        announcements_super($pdo);
        $d = body();
        $id = (int)($_GET['id'] ?? ($d['id'] ?? 0));
        if (!$id) {
            fail('ID pengumuman diperlukan.');
        }
        $pdo->prepare("UPDATE announcements SET isActive=0 WHERE id=?")->execute([$id]);
        ok(['announcement' => ['id' => $id, 'isActive' => 0]]);
        break;

    default:
        fail('Action tidak dikenali: ' . $action);
}