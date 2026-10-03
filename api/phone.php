<?php
// ====== Normalisasi nombor telefon Malaysia ======
// Dahulunya berada dalam whatsapp.php. Ia TIDAK ada kaitan dengan WhatsApp —
// ia pengesahan nombor telefon, dan tetap diperlukan oleh auth.php
// semasa pendaftaran.

/**
 * Normalkan sebarang input telefon kepada E.164 Malaysia, atau null.
 *
 * Terima: 012-3456789, +60123456789, 6012-345 6789, 0123456789
 * Tolak:  landline, nombor terlalu pendek/panjang, aksara bukan-digit.
 */
function normalize_phone(string $v): ?string
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