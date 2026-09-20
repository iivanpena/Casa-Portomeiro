<?php
// Devuelve las noches ocupadas (reservas confirmadas + bloqueos manuales).
declare(strict_types=1);
require __DIR__ . '/lib.php';
cfg();

$out = array_map(fn($r) => ['desde' => $r['desde'], 'hasta' => $r['hasta']], busy_ranges());
json_out(['ok' => true, 'ocupadas' => $out]);
