<?php
// Recibe una solicitud de reserva, la guarda y avisa a la propietaria por email
// (con el teléfono del cliente). También queda en el panel /admin.
declare(strict_types=1);
require __DIR__ . '/lib.php';
$c = cfg();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'error' => 'Método no permitido'], 405);

$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) json_out(['ok' => false, 'error' => 'Datos no válidos'], 400);

// Trampa anti-spam: si el campo oculto viene relleno, fingimos éxito y no guardamos nada.
if (!empty($in['web'])) json_out(['ok' => true, 'id' => 'x']);

if (!rate_ok('reserva', 5, 3600)) json_out(['ok' => false, 'error' => 'Demasiadas solicitudes seguidas. Inténtalo más tarde o escribe por WhatsApp.'], 429);

/* ---------- validación ---------- */
$nombre = trim((string) ($in['nombre'] ?? ''));
$tel    = clean_phone((string) ($in['telefono'] ?? ''));
$email  = trim((string) ($in['email'] ?? ''));
$pers   = (int) ($in['personas'] ?? 0);
$ent    = (string) ($in['entrada'] ?? '');
$sal    = (string) ($in['salida'] ?? '');
$coment = trim((string) ($in['comentarios'] ?? ''));

$nl = fn(string $s) => trim(preg_replace('/[\r\n\t]+/', ' ', $s));
$nombre = $nl($nombre);

if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 80)        json_out(['ok' => false, 'error' => 'Escribe tu nombre.'], 422);
if (!preg_match('/^\+?\d{9,15}$/', $tel))                     json_out(['ok' => false, 'error' => 'El teléfono no es válido.'], 422);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'El email no es válido.'], 422);
if ($pers < 1 || $pers > (int) $c['capacidad'])               json_out(['ok' => false, 'error' => 'El número de personas debe estar entre 1 y ' . $c['capacidad'] . '.'], 422);
if (!valid_date($ent) || !valid_date($sal))                   json_out(['ok' => false, 'error' => 'Las fechas no son válidas.'], 422);
if (empty($in['acepto']))                                     json_out(['ok' => false, 'error' => 'Debes aceptar las condiciones.'], 422);
$coment = mb_substr($coment, 0, 500);

$hoy = gmdate('Y-m-d', strtotime('today 12:00 ' . $c['zona_horaria']));
$noches = day_num($sal) - day_num($ent);
if ($ent < $hoy)                                              json_out(['ok' => false, 'error' => 'La fecha de entrada ya ha pasado.'], 422);
if ($noches < (int) $c['min_noches'])                         json_out(['ok' => false, 'error' => 'La salida debe ser posterior a la entrada.'], 422);
if ($noches > (int) $c['max_noches'])                         json_out(['ok' => false, 'error' => 'Para estancias de más de ' . $c['max_noches'] . ' noches, escribe por WhatsApp.'], 422);
if (!range_is_free($ent, $sal))                               json_out(['ok' => false, 'error' => 'Lo sentimos, esas fechas ya no están disponibles. Elige otras.'], 409);

$total = calc_total($noches);
$id = new_id();
$reserva = [
    'id' => $id, 'creada' => date('c'), 'estado' => 'pendiente',
    'nombre' => $nombre, 'telefono' => $tel, 'wa' => wa_number($tel), 'email' => $email,
    'personas' => $pers, 'entrada' => $ent, 'salida' => $sal, 'noches' => $noches,
    'total' => $total, 'comentarios' => $coment, 'email_enviado' => false,
];

update_json('reservas.json', function (array $rows) use ($reserva) { $rows[] = $reserva; return $rows; });

/* ---------- aviso por email a la propietaria ---------- */
$mailOk = false;
$to = $c['propietaria_email'] ?? '';
if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
    $fianza = (float) $c['fianza'];
    $wa = 'https://wa.me/' . $reserva['wa'] . '?text=' . rawurlencode(
        "Hola {$nombre}, soy la propietaria de {$c['nombre_casa']}. He recibido tu solicitud del " . fmt_es($ent) . " al " . fmt_es($sal) .
        ". Para confirmar la reserva necesito una fianza de " . eur($fianza) . " por Bizum o transferencia; el resto se paga en efectivo al llegar.");
    $panel = !empty($c['site_url']) ? rtrim($c['site_url'], '/') . '/admin/' : '';

    $lines = [
        "Nueva solicitud de reserva en {$c['nombre_casa']}",
        "",
        "Nombre:    {$nombre}",
        "TELÉFONO:  {$tel}",
        "Email:     " . ($email ?: '(no indicado)'),
        "Entrada:   " . fmt_es($ent),
        "Salida:    " . fmt_es($sal) . " ({$noches} " . ($noches === 1 ? 'noche' : 'noches') . ")",
        "Personas:  {$pers}",
        "Total estimado: " . eur($total) . "  ·  Fianza: " . eur($fianza) . "  ·  Resto en efectivo: " . eur(max(0, $total - $fianza)),
    ];
    if ($coment !== '') { $lines[] = ""; $lines[] = "Comentarios: {$coment}"; }
    $lines[] = "";
    $lines[] = "➡ Escríbele por WhatsApp (mensaje ya preparado):";
    $lines[] = $wa;
    if ($panel) { $lines[] = ""; $lines[] = "Confirmar o rechazar en el panel: {$panel}"; }

    $subject = "Nueva reserva: {$nombre} · " . fmt_es($ent) . " → " . fmt_es($sal);
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . mb_encode_mimeheader($c['nombre_casa'], 'UTF-8') . ' <' . $c['from_email'] . '>',
    ];
    if ($email !== '') $headers[] = 'Reply-To: ' . $email;
    $mailOk = @mail($to, mb_encode_mimeheader($subject, 'UTF-8'), implode("\r\n", $lines), implode("\r\n", $headers));
    if ($mailOk) {
        update_json('reservas.json', function (array $rows) use ($id) {
            foreach ($rows as &$r) if ($r['id'] === $id) $r['email_enviado'] = true;
            return $rows;
        });
    }
}

json_out(['ok' => true, 'id' => $id, 'total' => $total, 'aviso_email' => $mailOk]);
