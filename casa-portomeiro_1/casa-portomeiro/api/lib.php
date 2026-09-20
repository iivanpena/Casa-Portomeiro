<?php
// Funciones compartidas del backend de reservas.
declare(strict_types=1);

const DATA_DIR = __DIR__ . '/../data';

function cfg(): array {
    static $c = null;
    if ($c === null) {
        $c = require __DIR__ . '/config.php';
        date_default_timezone_set($c['zona_horaria'] ?? 'Europe/Madrid');
        // Contraseña cambiada desde el panel: tiene prioridad
        $over = read_json('admin.json', []);
        if (!empty($over['password_hash'])) $c['admin_password_hash'] = $over['password_hash'];
    }
    return $c;
}

/* ---------- almacenamiento en JSON con bloqueo de archivo ---------- */
function data_file(string $name): string {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0750, true);
    return DATA_DIR . '/' . $name;
}
function read_json(string $name, $default = []) {
    $f = data_file($name);
    if (!is_file($f)) return $default;
    $fh = fopen($f, 'r');
    if (!$fh) return $default;
    flock($fh, LOCK_SH);
    $raw = stream_get_contents($fh);
    flock($fh, LOCK_UN); fclose($fh);
    $j = json_decode($raw ?: '', true);
    return is_array($j) ? $j : $default;
}
/** Lee, modifica con $fn(array): array y guarda, todo bajo un único bloqueo. */
function update_json(string $name, callable $fn, $default = []) {
    $f = data_file($name);
    $fh = fopen($f, 'c+');
    if (!$fh) throw new RuntimeException('No se puede escribir en data/');
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $cur = json_decode($raw ?: '', true);
    if (!is_array($cur)) $cur = $default;
    $new = $fn($cur);
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $new;
}

/* ---------- fechas ---------- */
function valid_date(string $s): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return false;
    [$y, $m, $d] = array_map('intval', explode('-', $s));
    return checkdate($m, $d, $y);
}
function day_num(string $s): int { return (int) floor(strtotime($s . ' 12:00:00 UTC') / 86400); }
function fmt_es(string $s): string {
    $dias = ['dom','lun','mar','mié','jue','vie','sáb'];
    $meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    $t = strtotime($s . ' 12:00:00 UTC');
    return $dias[(int) gmdate('w', $t)] . ' ' . (int) gmdate('j', $t) . ' ' . $meses[(int) gmdate('n', $t) - 1] . ' ' . gmdate('Y', $t);
}
/** ¿Se solapan las noches de [a1,b1) y [a2,b2)? (b = día de salida) */
function overlaps(string $a1, string $b1, string $a2, string $b2): bool {
    return day_num($a1) < day_num($b2) && day_num($a2) < day_num($b1);
}
/** Rangos que bloquean el calendario: reservas confirmadas + bloqueos manuales. */
function busy_ranges(?array $reservas = null): array {
    $out = [];
    // $reservas permite reutilizar datos ya leídos (evita bloquear el mismo archivo dos veces).
    foreach ($reservas ?? read_json('reservas.json', []) as $r) {
        if (($r['estado'] ?? '') === 'confirmada') $out[] = ['desde' => $r['entrada'], 'hasta' => $r['salida'], 'tipo' => 'reserva', 'id' => $r['id']];
    }
    foreach (read_json('bloqueos.json', []) as $b) {
        $out[] = ['desde' => $b['desde'], 'hasta' => $b['hasta'], 'tipo' => 'bloqueo', 'id' => $b['id'], 'nota' => $b['nota'] ?? ''];
    }
    return $out;
}
function range_is_free(string $in, string $out, ?string $ignoreId = null, ?array $reservas = null): bool {
    foreach (busy_ranges($reservas) as $r) {
        if ($ignoreId !== null && $r['id'] === $ignoreId) continue;
        if (overlaps($in, $out, $r['desde'], $r['hasta'])) return false;
    }
    return true;
}

/* ---------- teléfonos / WhatsApp ---------- */
function clean_phone(string $p): string { return preg_replace('/[\s.\-()]/', '', $p); }
/** Devuelve el número en formato internacional sin '+' (asume España si son 9 dígitos). */
function wa_number(string $p): string {
    $p = clean_phone($p);
    if (str_starts_with($p, '+')) return substr($p, 1);
    if (str_starts_with($p, '00')) return substr($p, 2);
    if (preg_match('/^\d{9}$/', $p)) return '34' . $p;
    return $p;
}

/* ---------- respuestas y seguridad ---------- */
function json_out(array $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }
function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function new_id(): string { return bin2hex(random_bytes(6)); }

/** Limita intentos por IP y acción. Devuelve false si se supera el límite. */
function rate_ok(string $action, int $max, int $windowSec): bool {
    $ip = hash('sha256', client_ip());
    $ok = true;
    update_json('rate.json', function (array $rows) use (&$ok, $action, $ip, $max, $windowSec) {
        $now = time();
        foreach ($rows as $k => $v) { $rows[$k] = array_values(array_filter($v, fn($t) => $t > $now - 86400)); if (!$rows[$k]) unset($rows[$k]); }
        $k = $action . ':' . $ip;
        $hits = array_values(array_filter($rows[$k] ?? [], fn($t) => $t > $now - $windowSec));
        if (count($hits) >= $max) { $ok = false; }
        else { $hits[] = $now; }
        $rows[$k] = $hits;
        return $rows;
    });
    return $ok;
}

/* ---------- precio ---------- */
function calc_total(int $noches): float {
    return $noches * (float) cfg()['precio_noche'];   // precio fijo por noche, sin importar las personas
}
function eur(float $n): string {
    return number_format($n, ($n == floor($n)) ? 0 : 2, ',', '.') . ' €';
}
