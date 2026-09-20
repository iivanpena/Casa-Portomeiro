<?php
// ============================================================
// CONFIGURACIÓN DEL BACKEND (Casa Portomeiro)
// Este archivo NO se muestra a los visitantes (solo lo lee PHP).
// ============================================================
return [
    // Email donde la propietaria recibe cada solicitud (con el teléfono del cliente).
    // ⚠ CÁMBIALO por el email real de tu madre.
    'propietaria_email'    => 'CAMBIAR@tucorreo.com',

    // Su WhatsApp (formato internacional, solo números). Debe coincidir con js/config.js
    'propietaria_whatsapp' => '34605602794',

    // Remitente de los emails. Con Hostinger usa una cuenta de tu propio dominio
    // (p. ej. reservas@casaportomeiro.com) para que no caigan en spam.
    'from_email'           => 'reservas@CAMBIAR-TU-DOMINIO.com',

    // Dirección pública de la web (para el enlace al panel en los emails). Ej: https://casaportomeiro.com
    'site_url'             => '',

    'nombre_casa'          => 'Casa Portomeiro',
    'fianza'               => 50,
    'capacidad'            => 10,
    'precio_noche'         => 200,    // € por noche, toda la casa (debe coincidir con js/config.js)
    'min_noches'           => 1,
    'max_noches'           => 30,
    'zona_horaria'         => 'Europe/Madrid',

    // Contraseña del panel /admin (guardada cifrada). Se cambia desde el propio panel.
    'admin_password_hash'  => '$2y$12$EdQu0ye2Pwj9DuxcPSAbc.it9chiWQQMyr1HaDVnThqpJI1RSpely',

    // Clave secreta para el calendario .ics (sincronizar con Booking / Google Calendar)
    'ics_token'            => '03ff22ca3d62a33f26e9f5ea',
];
