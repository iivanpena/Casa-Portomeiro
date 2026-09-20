/* ============================================================
   CONFIGURACIÓN DE CASA PORTOMEIRO
   Todo lo que cambia con frecuencia está aquí: teléfono, precios,
   fianza, etc. No hace falta tocar nada más para ajustarlo.
   ============================================================ */
window.CASA = {
  nombre: "Casa Portomeiro",

  // WhatsApp / teléfono de la propietaria (formato internacional, SOLO números)
  // Este número es el que aparece en la ficha pública de Turismo de Galicia.
  // ⚠ Confirma que es el de tu madre; si no, cámbialo aquí Y en api/config.php
  whatsapp: "34605602794",
  telefonoVisible: "605 602 794",

  direccion: "Portomeiro 33, 15871 Val do Dubra, A Coruña",
  coords: { lat: 42.980944, lng: -8.614139 },
  registro: "VT-CO-000083",

  capacidad: 10,          // huéspedes máximos (3 dobles + 2 de dos camas)
  fianza: 50,             // € para confirmar la reserva (Bizum / transferencia)
  minNoches: 1,

  // Precio fijo por noche por toda la casa, sin importar el número de personas.
  // (debe coincidir con 'precio_noche' en api/config.php)
  precioNoche: 200,

  // Dónde está el backend PHP (carpeta api/). Si no existe (p. ej. GitHub Pages)
  // la web usa el modo WhatsApp automáticamente.
  apiBase: "api",

  // true  -> se ven marcadores elegantes donde falta una foto (para preparar la web)
  // false -> los huecos sin foto desaparecen (usar cuando ya estén las fotos reales)
  mostrarMarcadoresDeFoto: true
};
