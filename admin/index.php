<?php
// Panel de la propietaria: ver solicitudes, confirmarlas (bloquea el calendario),
// rechazarlas, bloquear fechas a mano y escribir al cliente por WhatsApp.
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';
$c = cfg();

session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_name('portomeiro_admin');
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$flash = $_SESSION['flash'] ?? null; unset($_SESSION['flash']);
function flash(string $m, string $t = 'ok'): void { $_SESSION['flash'] = [$m, $t]; }
function back(): never { header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?')); exit; }

/* ---------- login ---------- */
$loginError = '';
if (isset($_POST['login'])) {
    if (!rate_ok('login', 8, 900)) { $loginError = 'Demasiados intentos. Espera 15 minutos.'; }
    elseif (password_verify((string) ($_POST['password'] ?? ''), $c['admin_password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['auth'] = true; $_SESSION['csrf'] = bin2hex(random_bytes(16));
        back();
    } else { $loginError = 'Contraseña incorrecta.'; }
}
if (isset($_GET['salir'])) { session_destroy(); header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?')); exit; }

if (empty($_SESSION['auth'])) { ?>
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Panel · Casa Portomeiro</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1E332A;font-family:system-ui,sans-serif;color:#1F2A24}
form{background:#FCFAF5;padding:34px;border-radius:20px;width:min(360px,90vw)}
h1{font-family:Georgia,serif;font-weight:400;margin:0 0 20px;font-size:1.6rem}
input{width:100%;padding:14px;font-size:16px;border:1.5px solid #ddd;border-radius:12px;box-sizing:border-box;margin-bottom:14px}
button{width:100%;padding:14px;border:0;border-radius:999px;background:#B8583A;color:#fff;font-weight:700;font-size:1rem}
.e{background:#FCE9E5;color:#8A2B1E;padding:10px 14px;border-radius:10px;margin-bottom:14px;font-size:.9rem}
</style></head><body>
<form method="post"><h1>Panel de reservas</h1>
<?php if ($loginError): ?><div class="e"><?= h($loginError) ?></div><?php endif; ?>
<input type="password" name="password" placeholder="Contraseña" autofocus required>
<button name="login" value="1">Entrar</button></form></body></html>
<?php exit; }

/* ---------- acciones (POST + CSRF) ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion'])) {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) { flash('Sesión caducada, inténtalo de nuevo.', 'err'); back(); }
    $a = $_POST['accion']; $id = (string) ($_POST['id'] ?? '');

    if (in_array($a, ['confirmar', 'rechazar', 'cancelar', 'borrar'], true)) {
        $msg = ''; $type = 'ok';
        update_json('reservas.json', function (array $rows) use ($a, $id, &$msg, &$type) {
            foreach ($rows as $i => &$r) {
                if ($r['id'] !== $id) continue;
                if ($a === 'confirmar') {
                    if (!range_is_free($r['entrada'], $r['salida'], $id, $rows)) { $msg = 'No se puede confirmar: esas fechas se solapan con otra reserva o bloqueo.'; $type = 'err'; break; }
                    $r['estado'] = 'confirmada'; $r['confirmada_en'] = date('c'); $msg = 'Reserva confirmada. Las fechas ya salen ocupadas en la web.';
                } elseif ($a === 'rechazar') { $r['estado'] = 'rechazada'; $msg = 'Solicitud rechazada.'; }
                elseif ($a === 'cancelar') { $r['estado'] = 'cancelada'; $msg = 'Reserva cancelada. Las fechas vuelven a estar libres.'; }
                elseif ($a === 'borrar') { unset($rows[$i]); $msg = 'Eliminada.'; }
                break;
            }
            return array_values($rows);
        });
        flash($msg ?: 'No se encontró la reserva.', $msg ? $type : 'err'); back();
    }
    if ($a === 'bloquear') {
        $d = (string) ($_POST['desde'] ?? ''); $h = (string) ($_POST['hasta'] ?? ''); $nota = mb_substr(trim((string) ($_POST['nota'] ?? '')), 0, 120);
        if (!valid_date($d) || !valid_date($h) || $h <= $d) { flash('Fechas no válidas: la salida debe ser posterior a la entrada.', 'err'); back(); }
        if (!range_is_free($d, $h)) { flash('Esas fechas ya están ocupadas.', 'err'); back(); }
        update_json('bloqueos.json', function (array $rows) use ($d, $h, $nota) { $rows[] = ['id' => new_id(), 'desde' => $d, 'hasta' => $h, 'nota' => $nota]; return $rows; });
        flash('Fechas bloqueadas.'); back();
    }
    if ($a === 'desbloquear') {
        update_json('bloqueos.json', fn(array $rows) => array_values(array_filter($rows, fn($b) => $b['id'] !== $id)));
        flash('Bloqueo eliminado.'); back();
    }
    if ($a === 'password') {
        $old = (string) ($_POST['actual'] ?? ''); $new = (string) ($_POST['nueva'] ?? '');
        if (!password_verify($old, $c['admin_password_hash'])) { flash('La contraseña actual no es correcta.', 'err'); back(); }
        if (mb_strlen($new) < 8) { flash('La nueva contraseña debe tener al menos 8 caracteres.', 'err'); back(); }
        update_json('admin.json', function (array $x) use ($new) { $x['password_hash'] = password_hash($new, PASSWORD_DEFAULT); return $x; });
        flash('Contraseña cambiada.'); back();
    }
    back();
}

/* ---------- datos para la vista ---------- */
$reservas = read_json('reservas.json', []);
usort($reservas, fn($x, $y) => strcmp($y['creada'], $x['creada']));
$bloqueos = read_json('bloqueos.json', []);
usort($bloqueos, fn($x, $y) => strcmp($x['desde'], $y['desde']));
$hoy = date('Y-m-d');
$pend = array_filter($reservas, fn($r) => $r['estado'] === 'pendiente');
$conf = array_filter($reservas, fn($r) => $r['estado'] === 'confirmada' && $r['salida'] >= $hoy);
usort($conf, fn($x, $y) => strcmp($x['entrada'], $y['entrada']));
$otras = array_filter($reservas, fn($r) => !in_array($r['estado'], ['pendiente'], true) && !($r['estado'] === 'confirmada' && $r['salida'] >= $hoy));

function wa_link(array $r, array $c): string {
    $msg = "Hola {$r['nombre']}, soy la propietaria de {$c['nombre_casa']}. He recibido tu solicitud del " . fmt_es($r['entrada']) . " al " . fmt_es($r['salida']) .
        " para {$r['personas']} " . ($r['personas'] == 1 ? 'persona' : 'personas') . ". Para confirmar la reserva necesito una fianza de " . eur((float) $c['fianza']) .
        " por Bizum o transferencia; el resto (" . eur(max(0, (float) $r['total'] - (float) $c['fianza'])) . ") se paga en efectivo al llegar. ¿Te va bien?";
    return 'https://wa.me/' . $r['wa'] . '?text=' . rawurlencode($msg);
}
function card(array $r, array $c, string $csrf): void { ?>
  <article class="rc st-<?= h($r['estado']) ?>">
    <div class="rc__top">
      <div><b><?= h($r['nombre']) ?></b><span class="badge"><?= h($r['estado']) ?></span></div>
      <small>Recibida <?= h(date('d/m/Y H:i', strtotime($r['creada']))) ?></small>
    </div>
    <div class="rc__dates"><?= h(fmt_es($r['entrada'])) ?> → <?= h(fmt_es($r['salida'])) ?> <em>(<?= (int) $r['noches'] ?> <?= $r['noches'] == 1 ? 'noche' : 'noches' ?>)</em></div>
    <div class="rc__meta">
      <span>👥 <?= (int) $r['personas'] ?> <?= $r['personas'] == 1 ? 'persona' : 'personas' ?></span>
      <span>💶 <?= h(eur((float) $r['total'])) ?> · fianza <?= h(eur((float) $c['fianza'])) ?></span>
      <span>📞 <a href="tel:+<?= h($r['wa']) ?>"><?= h($r['telefono']) ?></a></span>
      <?php if ($r['email']): ?><span>✉ <a href="mailto:<?= h($r['email']) ?>"><?= h($r['email']) ?></a></span><?php endif; ?>
    </div>
    <?php if ($r['comentarios']): ?><p class="rc__note">“<?= h($r['comentarios']) ?>”</p><?php endif; ?>
    <form method="post" class="rc__actions">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="id" value="<?= h($r['id']) ?>">
      <a class="b b--wa" target="_blank" rel="noopener" href="<?= h(wa_link($r, $c)) ?>">Escribir por WhatsApp</a>
      <?php if ($r['estado'] === 'pendiente'): ?>
        <button class="b b--ok" name="accion" value="confirmar" onclick="return confirm('¿Confirmar? Las fechas quedarán ocupadas en la web.')">Confirmar (fianza recibida)</button>
        <button class="b b--no" name="accion" value="rechazar" onclick="return confirm('¿Rechazar esta solicitud?')">Rechazar</button>
      <?php elseif ($r['estado'] === 'confirmada'): ?>
        <button class="b b--no" name="accion" value="cancelar" onclick="return confirm('¿Cancelar la reserva y liberar las fechas?')">Cancelar reserva</button>
      <?php else: ?>
        <button class="b b--no" name="accion" value="borrar" onclick="return confirm('¿Eliminar definitivamente?')">Eliminar</button>
      <?php endif; ?>
    </form>
  </article>
<?php } ?>
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Panel · Casa Portomeiro</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#F7F2E8;color:#1F2A24;font:16px/1.5 system-ui,sans-serif}
header{background:#1E332A;color:#F7F2E8;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:10px}
header h1{margin:0;font:400 1.3rem Georgia,serif}header a{color:#C9A45C;font-size:.9rem}
main{max-width:860px;margin:0 auto;padding:22px 16px 80px}
h2{font:400 1.5rem Georgia,serif;margin:34px 0 14px}h2 small{font:400 .9rem system-ui;color:#4B5A51}
.flash{padding:12px 16px;border-radius:12px;margin-bottom:18px}.flash.ok{background:#DDEBDD;color:#1E4D2B}.flash.err{background:#FCE9E5;color:#8A2B1E}
.rc{background:#fff;border:1px solid rgba(31,42,36,.12);border-radius:16px;padding:18px;margin-bottom:14px}
.rc.st-pendiente{border-left:6px solid #C9A45C}.rc.st-confirmada{border-left:6px solid #2E7D4F}.rc.st-rechazada,.rc.st-cancelada{opacity:.65;border-left:6px solid #B8583A}
.rc__top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}
.badge{margin-left:10px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;background:#E8DFCE;padding:3px 9px;border-radius:999px}
.rc__dates{font:400 1.2rem Georgia,serif;margin:8px 0}.rc__dates em{font:400 .95rem system-ui;color:#4B5A51}
.rc__meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:#4B5A51;font-size:.95rem}.rc__meta a{color:#1F2A24}
.rc__note{background:#F7F2E8;padding:8px 12px;border-radius:10px;font-size:.92rem;margin:10px 0 0}
.rc__actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.b{border:0;border-radius:999px;padding:11px 18px;font:700 .9rem system-ui;text-decoration:none;cursor:pointer;color:#fff;display:inline-block}
.b--wa{background:#1FA855}.b--ok{background:#2E4A3B}.b--no{background:#fff;color:#8A2B1E;box-shadow:inset 0 0 0 1.5px #B8583A}
.box{background:#fff;border:1px solid rgba(31,42,36,.12);border-radius:16px;padding:18px}
.box form{display:grid;gap:10px}.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
label{font-size:.85rem;font-weight:700}input{width:100%;padding:11px;font-size:16px;border:1.5px solid #ddd;border-radius:10px;margin-top:4px}
.bl{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(31,42,36,.1)}
.bl form{margin:0}.empty{color:#4B5A51;font-style:italic}
code{background:#E8DFCE;padding:2px 6px;border-radius:6px;word-break:break-all;font-size:.85rem}
details summary{cursor:pointer;font-weight:700;padding:8px 0}
@media(max-width:520px){.row2{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Casa Portomeiro · Panel</h1><span><a href="../" target="_blank">Ver web</a> · <a href="?salir=1">Salir</a></span></header>
<main>
<?php if ($flash): ?><div class="flash <?= h($flash[1]) ?>"><?= h($flash[0]) ?></div><?php endif; ?>

<h2>Solicitudes pendientes <small>(<?= count($pend) ?>)</small></h2>
<?php if (!$pend): ?><p class="empty">No hay solicitudes pendientes.</p><?php endif; ?>
<?php foreach ($pend as $r) card($r, $c, $csrf); ?>

<h2>Próximas reservas confirmadas <small>(<?= count($conf) ?>)</small></h2>
<?php if (!$conf): ?><p class="empty">Todavía no hay reservas confirmadas.</p><?php endif; ?>
<?php foreach ($conf as $r) card($r, $c, $csrf); ?>

<h2>Bloquear fechas a mano</h2>
<div class="box">
  <p style="margin-top:0;color:#4B5A51;font-size:.92rem">Úsalo para reservas que entran por Booking u otros portales, o si la casa no está disponible. Esas noches saldrán ocupadas en la web.</p>
  <form method="post"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="accion" value="bloquear">
    <div class="row2"><div><label>Entrada</label><input type="date" name="desde" required></div><div><label>Salida</label><input type="date" name="hasta" required></div></div>
    <div><label>Nota (opcional)</label><input type="text" name="nota" maxlength="120" placeholder="Ej: Reserva de Booking"></div>
    <button class="b b--ok">Bloquear fechas</button>
  </form>
  <?php foreach ($bloqueos as $b): ?>
    <div class="bl"><span><b><?= h(fmt_es($b['desde'])) ?> → <?= h(fmt_es($b['hasta'])) ?></b><?= !empty($b['nota']) ? ' · ' . h($b['nota']) : '' ?></span>
      <form method="post"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="id" value="<?= h($b['id']) ?>"><button class="b b--no" name="accion" value="desbloquear">Quitar</button></form></div>
  <?php endforeach; ?>
</div>

<?php if ($otras): ?>
<h2>Historial <small>(<?= count($otras) ?>)</small></h2>
<details><summary>Ver rechazadas, canceladas y pasadas</summary><?php foreach ($otras as $r) card($r, $c, $csrf); ?></details>
<?php endif; ?>

<h2>Sincronizar con Booking / Google Calendar</h2>
<div class="box"><p style="margin-top:0;font-size:.92rem;color:#4B5A51">Enlace de calendario (.ics) con las fechas ocupadas de esta web. Puedes importarlo en Booking (“Sincronizar calendario”) para evitar reservas dobles. Guárdalo en privado.</p>
<?php $ics = (!empty($c['site_url']) ? rtrim($c['site_url'], '/') : 'https://TU-DOMINIO') . '/api/calendario.php?token=' . $c['ics_token']; ?>
<code><?= h($ics) ?></code></div>

<h2>Cambiar contraseña</h2>
<div class="box"><form method="post"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="accion" value="password">
  <div class="row2"><div><label>Contraseña actual</label><input type="password" name="actual" required autocomplete="current-password"></div>
  <div><label>Nueva contraseña (mín. 8)</label><input type="password" name="nueva" minlength="8" required autocomplete="new-password"></div></div>
  <button class="b b--ok">Guardar contraseña</button></form></div>
</main></body></html>
