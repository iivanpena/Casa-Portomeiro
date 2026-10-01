/* Casa Bicaño e Casa Busto — demo web · lógica compartida
   ---------------------------------------------------------------
   CONFIGURACIÓN: cambia estos valores cuando el propietario confirme.
*/
const CONFIG = {
  modoDemo: true,          // true = el formulario no envía nada
  fotosLocales: false,     // pon true cuando tengas las fotos en img/bicano-1.jpg, img/busto-1.jpg...
  telefono: "653 684 144",
  email: "casarusticabusto@gmail.com"
};

/* Datos de cada casa. Precio y capacidad: PROVISIONALES, confirmar con el dueño. */
const CASAS = {
  bicano: {
    nombre: "Casa Bicaño", pagina: "bicano.html",
    precio: 280, minNoches: 2, maxHuespedes: 8,
    entrada: "15:00 a 19:30", salida: "10:00 a 11:00",
    nota: "9,3", opiniones: 76,
    fotos: [
      "15651/1565195/1565195671/Casa-Bicano-Meis-Exterior.JPEG",
      "15651/1565195/1565195680/Casa-Bicano-Meis-Exterior.JPEG",
      "15651/1565195/1565195692/Casa-Bicano-Meis-Exterior.JPEG",
      "15651/1565195/1565195704/Casa-Bicano-Meis-Exterior.JPEG",
      "15671/1567160/1567160957/Casa-Bicano-Meis-Amenities.JPEG",
      "9224/922442/922442683/Casa-Bicano-Meis-Kitchen.JPEG"
    ].map(p => "https://casav-rustica-bicano-pontevedra.hotelmix.es/data/Photos/OriginalPhoto/" + p)
     .concat(["542710802", "297480185", "544170911"].map(n => `https://q-xx.bstatic.com/xdata/images/hotel/max1280x900/${n}.jpg`))
  },
  busto: {
    nombre: "Casa Busto", pagina: "busto.html",
    precio: 300, minNoches: 2, maxHuespedes: 12,
    entrada: "desde las 16:00", salida: "hasta las 10:00",
    nota: "8,9", opiniones: 53,
    fotos: [
      "12331/1233191/1233191270/Casa-Rustica-Busto-Villa-Pontevedra-Swimming-Pool.JPEG",
      "17567/1756724/1756724393/Casa-Rustica-Busto-Villa-Pontevedra-Exterior.JPEG",
      "17567/1756724/1756724397/Casa-Rustica-Busto-Villa-Pontevedra-Exterior.JPEG",
      "17567/1756724/1756724398/Casa-Rustica-Busto-Villa-Pontevedra-Exterior.JPEG",
      "17567/1756724/1756724422/Casa-Rustica-Busto-Villa-Pontevedra-Exterior.JPEG"
    ].map(p => "https://casa-rustica-busto-pontevedra.hotelmix.es/data/Photos/OriginalPhoto/" + p)
  }
};
if (CONFIG.fotosLocales) for (const [k, c] of Object.entries(CASAS)) c.fotos = c.fotos.map((_, i) => `img/${k}-${i + 1}.jpg`);
const TODAS = [...CASAS.bicano.fotos, ...CASAS.busto.fotos];
const VACIA = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#CBD4C3"/></svg>');

/* ---------- Cabecera y pie ---------- */
const PAGINAS = [
  ["index.html", "Inicio"], ["bicano.html", "Casa Bicaño"], ["busto.html", "Casa Busto"],
  ["galeria.html", "Galería"], ["entorno.html", "Armenteira"]
];
function montarCabecera() {
  const actual = location.pathname.split("/").pop() || "index.html";
  const links = PAGINAS.map(([h, t]) => `<a href="${h}"${h === actual ? ' aria-current="page"' : ""}>${t}</a>`).join("");
  const head = document.getElementById("cabecera");
  if (head) head.outerHTML = `
    ${CONFIG.modoDemo ? '<div class="demo-bar">Versión de demostración preparada para Casa Bicaño e Casa Busto</div>' : ""}
    <header class="head"><div class="wrap">
      <a class="logo" href="index.html">Bicaño &amp; Busto</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menú</button>
      <nav class="nav" id="nav">${links}<a class="btn" href="reservar.html">Reservar</a></nav>
    </div></header>`;
  const btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (btn) btn.addEventListener("click", () => btn.setAttribute("aria-expanded", nav.classList.toggle("abierto")));
  const pie = document.getElementById("pie");
  if (pie) pie.outerHTML = `
    <footer class="pie"><div class="wrap">
      <div class="cols">
        <div><h4>Casa Bicaño e Casa Busto</h4>
          <p>Dos casas rurales con piscina en Armenteira, en el corazón de O Salnés.</p>
          <p style="margin-top:10px">Bicaño 1 B y Busto 14, Armenteira, 36192 Meis (Pontevedra)</p></div>
        <div><h4>Páginas</h4>${PAGINAS.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}<a href="reservar.html">Reservar</a></div>
        <div><h4>Contacto</h4>
          <a href="tel:+34${CONFIG.telefono.replace(/ /g, "")}">${CONFIG.telefono}</a>
          <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>
          <p style="margin-top:10px">Licencias VUT PO-003978 y PO-005190</p></div>
      </div>
      <div class="legal">© ${new Date().getFullYear()} Casa Bicaño e Casa Busto · Aviso legal · Política de privacidad</div>
    </div></footer>`;
}

/* ---------- Imágenes: data-casa="bicano" data-foto="1" ---------- */
function ponerFotos() {
  document.querySelectorAll("img[data-foto]").forEach(img => {
    const lista = img.dataset.casa ? CASAS[img.dataset.casa].fotos : TODAS;
    img.src = lista[(+img.dataset.foto - 1) % lista.length];
    img.loading = img.dataset.eager ? "eager" : "lazy";
    img.onerror = () => { img.onerror = null; img.src = VACIA; };
  });
}

/* ---------- Galerías y visor ---------- */
let visorLista = TODAS, visorI = 0, lb;
function montarGaleria() {
  document.querySelectorAll("[data-galeria]").forEach(g => {
    const casa = g.dataset.galeria, lista = casa === "todas" ? TODAS : CASAS[casa].fotos;
    g.innerHTML = lista.map((src, i) => {
      const quien = casa !== "todas" ? casa : (i < CASAS.bicano.fotos.length ? "bicano" : "busto");
      return `<button data-i="${i}" data-quien="${quien}" aria-label="Ver foto ${i + 1}"><img src="${src}" alt="${CASAS[quien].nombre}, foto" loading="lazy" onerror="this.parentNode.remove()"></button>`;
    }).join("");
    g.addEventListener("click", e => { const b = e.target.closest("button"); if (b) abrirVisor(lista, +b.dataset.i); });
  });
  const tabs = document.querySelector(".tabs");
  if (tabs) tabs.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    document.querySelectorAll("#galeria button").forEach(x => x.hidden = b.dataset.f !== "todas" && x.dataset.quien !== b.dataset.f);
  });
}
function abrirVisor(lista, i) {
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = `<img alt=""><button class="lb-cerrar" aria-label="Cerrar">×</button>
      <button class="lb-prev" aria-label="Anterior">‹</button><button class="lb-next" aria-label="Siguiente">›</button><div class="lb-cont"></div>`;
    document.body.appendChild(lb);
    lb.querySelector(".lb-cerrar").onclick = cerrarVisor;
    lb.querySelector(".lb-prev").onclick = () => moverVisor(-1);
    lb.querySelector(".lb-next").onclick = () => moverVisor(1);
    lb.addEventListener("click", e => { if (e.target === lb) cerrarVisor(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("abierto")) return;
      if (e.key === "Escape") cerrarVisor();
      if (e.key === "ArrowLeft") moverVisor(-1);
      if (e.key === "ArrowRight") moverVisor(1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
    lb.addEventListener("touchend", e => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) moverVisor(dx < 0 ? 1 : -1); x0 = null;
    });
  }
  visorLista = lista; visorI = i; pintarVisor();
  lb.classList.add("abierto"); document.body.style.overflow = "hidden"; lb.querySelector(".lb-cerrar").focus();
}
function moverVisor(d) { visorI = (visorI + d + visorLista.length) % visorLista.length; pintarVisor(); }
function pintarVisor() {
  lb.querySelector("img").src = visorLista[visorI];
  lb.querySelector(".lb-cont").textContent = `${visorI + 1} / ${visorLista.length}`;
}
function cerrarVisor() { lb.classList.remove("abierto"); document.body.style.overflow = ""; }

/* ---------- Reservas ---------- */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const clave = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = d => `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

/* Días ocupados de ejemplo, distintos para cada casa (en la versión real vienen del calendario del dueño) */
const OCUPADOS = { bicano: new Set(), busto: new Set() };
(function () {
  const bloques = { bicano: [[3, 3], [10, 2], [17, 4], [29, 3], [40, 2], [52, 4], [66, 3]], busto: [[5, 2], [12, 3], [24, 4], [33, 2], [45, 3], [58, 2], [72, 4]] };
  for (const [k, lista] of Object.entries(bloques)) lista.forEach(([ini, n]) => {
    for (let j = 0; j < n; j++) { const d = new Date(hoy); d.setDate(d.getDate() + ini + j); OCUPADOS[k].add(clave(d)); }
  });
})();

let casaSel = "bicano", mesVista = new Date(hoy.getFullYear(), hoy.getMonth(), 1), entrada = null, salida = null;

function montarReservas() {
  const cal = document.getElementById("calendario");
  if (!cal) return;
  const pedida = new URLSearchParams(location.search).get("casa") || location.hash.slice(1);
  if (CASAS[pedida]) casaSel = pedida;
  document.querySelectorAll("[name=casa]").forEach(r => {
    r.checked = r.value === casaSel;
    r.addEventListener("change", () => { casaSel = r.value; entrada = salida = null; rellenarHuespedes(); pintarCalendario(); pintarResumen(); });
  });
  document.getElementById("mes-prev").onclick = () => { mesVista.setMonth(mesVista.getMonth() - 1); pintarCalendario(); };
  document.getElementById("mes-next").onclick = () => { mesVista.setMonth(mesVista.getMonth() + 1); pintarCalendario(); };
  cal.addEventListener("click", e => {
    const b = e.target.closest(".dia"); if (!b || b.disabled) return;
    elegirDia(new Date(b.dataset.fecha + "T00:00:00"));
  });
  document.getElementById("form-reserva").addEventListener("submit", enviarReserva);
  rellenarHuespedes(); pintarCalendario(); pintarResumen();
}
function rellenarHuespedes() {
  const sel = document.getElementById("huespedes"), prev = +sel.value || 4;
  sel.innerHTML = "";
  for (let i = 1; i <= CASAS[casaSel].maxHuespedes; i++) sel.add(new Option(`${i} ${i === 1 ? "persona" : "personas"}`, i));
  sel.value = Math.min(prev, CASAS[casaSel].maxHuespedes);
}
const libreEntre = (a, b) => { for (let d = new Date(a); d < b; d.setDate(d.getDate() + 1)) if (OCUPADOS[casaSel].has(clave(d))) return false; return true; };
function elegirDia(d) {
  const err = document.getElementById("error-fechas"); err.textContent = "";
  if (!entrada || salida || d <= entrada) { entrada = d; salida = null; }
  else if (!libreEntre(entrada, d)) err.textContent = "Hay noches ocupadas entre esas fechas. Elige otra salida.";
  else if (Math.round((d - entrada) / 864e5) < CASAS[casaSel].minNoches) err.textContent = `La estancia mínima es de ${CASAS[casaSel].minNoches} noches.`;
  else salida = d;
  pintarCalendario(); pintarResumen();
}
function pintarCalendario() {
  const cal = document.getElementById("calendario");
  document.getElementById("mes-titulo").textContent = `${MESES[mesVista.getMonth()]} ${mesVista.getFullYear()}`;
  document.getElementById("mes-prev").disabled = mesVista.getFullYear() === hoy.getFullYear() && mesVista.getMonth() === hoy.getMonth();
  let h = ["L","M","X","J","V","S","D"].map(d => `<div class="dow">${d}</div>`).join("");
  const primero = (new Date(mesVista).getDay() + 6) % 7;
  const nDias = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0).getDate();
  for (let i = 0; i < primero; i++) h += "<div></div>";
  for (let n = 1; n <= nDias; n++) {
    const d = new Date(mesVista.getFullYear(), mesVista.getMonth(), n), k = clave(d);
    const ocupado = OCUPADOS[casaSel].has(k), pasado = d < hoy;
    const salidaOk = entrada && !salida && d > entrada && libreEntre(entrada, d);
    let cls = "dia";
    if (ocupado) cls += " ocupado";
    if (entrada && k === clave(entrada)) cls += " ini";
    if (salida && k === clave(salida)) cls += " fin";
    if (entrada && salida && d > entrada && d < salida) cls += " rango";
    h += `<button type="button" class="${cls}" data-fecha="${k}" ${pasado || (ocupado && !salidaOk) ? "disabled" : ""} aria-label="${fmt(d)}${ocupado ? ", ocupado" : ""}">${n}</button>`;
  }
  cal.innerHTML = h;
}
function pintarResumen() {
  const r = document.getElementById("resumen"), btn = document.getElementById("btn-reservar"), c = CASAS[casaSel];
  if (!entrada) { r.innerHTML = `<b>${c.nombre}</b><br>Elige en el calendario el día de llegada y el de salida.`; btn.disabled = true; return; }
  if (!salida) { r.innerHTML = `<b>${c.nombre}</b><br>Llegada: <b>${fmt(entrada)}</b>. Ahora elige el día de salida.`; btn.disabled = true; return; }
  const n = Math.round((salida - entrada) / 864e5), total = n * c.precio;
  r.innerHTML = `
    <div class="fila"><span>Casa</span><b>${c.nombre}</b></div>
    <div class="fila"><span>Llegada</span><b>${fmt(entrada)}</b></div>
    <div class="fila"><span>Salida</span><b>${fmt(salida)}</b></div>
    <div class="fila"><span>${n} noches × ${c.precio} €</span><span>${total} €</span></div>
    <div class="fila total"><span>Total orientativo</span><span>${total} €</span></div>`;
  btn.disabled = false;
}
function enviarReserva(e) {
  e.preventDefault();
  const f = e.target;
  if (!entrada || !salida) return;
  if (!f.checkValidity()) { f.reportValidity(); return; }
  console.log("Solicitud de reserva (demo):", { casa: casaSel, nombre: f.nombre.value, telefono: f.telefono.value, email: f.email.value, huespedes: f.huespedes.value, entrada: clave(entrada), salida: clave(salida), comida: f.comida.checked, mensaje: f.mensaje.value });
  f.style.display = "none";
  const ok = document.getElementById("exito");
  ok.querySelector("p").textContent = `${f.nombre.value.split(" ")[0]}, hemos recibido tu solicitud para ${CASAS[casaSel].nombre} del ${fmt(entrada)} al ${fmt(salida)}. Te llamaremos para confirmar la reserva.` + (CONFIG.modoDemo ? " (Esto es una demostración: no se ha enviado nada.)" : "");
  ok.classList.add("visible"); ok.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- Aparición de secciones ---------- */
function apariciones() {
  const els = document.querySelectorAll(".aparece");
  if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("visto")); return; }
  const io = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visto"); io.unobserve(en.target); } }), { threshold: .12 });
  els.forEach(el => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => { montarCabecera(); ponerFotos(); montarGaleria(); montarReservas(); apariciones(); });
