<?php
// Calendario .ics con las fechas ocupadas. Se puede importar en Booking, Google Calendar, etc.
// Uso:  https://TU-DOMINIO/api/calendario.php?token=TU_TOKEN   (el token está en api/config.php)
declare(strict_types=1);
require __DIR__ . '/lib.php';
$c = cfg();

if (!hash_equals((string) $c['ics_token'], (string) ($_GET['token'] ?? ''))) { http_response_code(403); exit('Forbidden'); }

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="casa-portomeiro.ics"');
$out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Casa Portomeiro//Reservas//ES", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Casa Portomeiro"];
foreach (busy_ranges() as $r) {
    $out[] = "BEGIN:VEVENT";
    $out[] = "UID:" . $r['id'] . "@casaportomeiro";
    $out[] = "DTSTAMP:" . gmdate('Ymd\THis\Z');
    $out[] = "DTSTART;VALUE=DATE:" . str_replace('-', '', $r['desde']);
    $out[] = "DTEND;VALUE=DATE:" . str_replace('-', '', $r['hasta']);
    $out[] = "SUMMARY:Ocupado";
    $out[] = "END:VEVENT";
}
$out[] = "END:VCALENDAR";
echo implode("\r\n", $out) . "\r\n";
