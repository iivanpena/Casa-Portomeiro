/* ============================================================
   CASA PORTOMEIRO · animaciones de scroll + sistema de reservas
   ============================================================ */
(function () {
  "use strict";
  var C = window.CASA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var eur = function (n) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  };

  /* ---------- datos de config en la página ---------- */
  $$("[data-fianza]").forEach(function (el) { el.textContent = eur(C.fianza); });
  $$("[data-precio]").forEach(function (el) { el.textContent = eur(C.precioNoche); });
  $("#footTel").textContent = C.telefonoVisible;
  $("#footWa").href = "https://wa.me/" + C.whatsapp;
  $("#footReg").textContent = C.registro;
  $("#year").textContent = new Date().getFullYear();
  $("#personas").max = C.capacidad;
  if (!C.mostrarMarcadoresDeFoto) document.body.classList.add("no-ph");

  /* ---------- fotos que faltan ---------- */
  function markMissing(img) {
    var ph = img.closest(".ph");
    if (ph) ph.classList.add("ph--empty");
    img.remove();
    setupGallery();
  }
  document.addEventListener("error", function (e) {
    if (e.target && e.target.tagName === "IMG") markMissing(e.target);
  }, true);
  $$("img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing(img);
  });

  /* ---------- NAV ---------- */
  var nav = $("#nav"), burger = $("#burger"), links = $("#navLinks");
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
    nav.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("a", links).forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("is-open"); nav.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
    });
  });

  /* ---------- reveal / máscaras / contadores ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      // la máscara (clip-path) se observa a través de su contenedor: un elemento
      // recortado por completo nunca cuenta como "visible" para el observador
      var m = en.target.querySelector(":scope > .mask");
      if (m) m.classList.add("is-in");
      if (en.target.dataset.count) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, .space, [data-count]").forEach(function (el) { io.observe(el); });

  function countUp(el) {
    var target = +el.dataset.count, t0 = null, dur = 1300;
    if (reduce) { el.textContent = target; return; }
    (function step(t) {
      if (!t0) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ---------- manifiesto: palabras que se encienden al hacer scroll ---------- */
  var mani = $("#manifesto");
  var words = mani.textContent.trim().split(/\s+/);
  mani.innerHTML = words.map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
  var wEls = $$(".w", mani);

  /* ---------- galería con scroll horizontal (escritorio) ---------- */
  var gal = $("#galeria"), track = $("#galleryTrack"), galMax = 0, galPinned = false;
  function setupGallery() {
    if (!gal || !track) return;   // aún no inicializada (una foto puede fallar antes)
    galPinned = window.innerWidth > 860 && !reduce;
    if (!galPinned) { gal.style.height = ""; track.style.transform = ""; return; }
    galMax = Math.max(0, track.scrollWidth - window.innerWidth + 40);
    gal.style.height = (galMax + window.innerHeight) + "px";
  }
  window.addEventListener("resize", setupGallery);
  window.addEventListener("load", setupGallery);
  setupGallery();

  /* ---------- bucle de scroll (rAF) ---------- */
  var heroBg = $(".hero__bg"), heroContent = $("#heroContent"), hero = $("#inicio");
  var progress = $("#progress"), fab = $("#fab"), booking = $("#reservar");
  var pimgs = $$("[data-parallax-img]");
  var lastY = 0, ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight - vh;

    progress.style.transform = "scaleX(" + (docH > 0 ? y / docH : 0) + ")";

    nav.classList.toggle("is-solid", y > 60);
    if (!links.classList.contains("is-open")) {
      if (y > lastY + 4 && y > 500) nav.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 200) nav.classList.remove("is-hidden");
    }
    lastY = y;

    if (!reduce) {
      if (y < vh * 1.2) {
        heroBg.style.transform = "translate3d(0," + (y * 0.35) + "px,0)";
        heroContent.style.transform = "translate3d(0," + (y * -0.12) + "px,0)";
        heroContent.style.opacity = clamp(1 - y / (vh * 0.75), 0, 1);
      }
      pimgs.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        el.style.transform = "translate3d(0," + (p * -9) + "%,0)";
      });
    }

    // manifiesto
    var mr = mani.getBoundingClientRect();
    var mp = clamp((vh * 0.82 - mr.top) / (mr.height + vh * 0.25), 0, 1);
    var lit = Math.round(mp * wEls.length * 1.08);
    wEls.forEach(function (w, i) { w.classList.toggle("on", i < lit); });

    // galería
    if (galPinned) {
      var gr = gal.getBoundingClientRect();
      var gp = clamp(-gr.top / Math.max(1, gr.height - vh), 0, 1);
      track.style.transform = "translate3d(" + (-gp * galMax) + "px,0,0)";
    }

    // botón flotante
    var br = booking.getBoundingClientRect();
    fab.classList.toggle("is-on", y > vh * 0.9 && !(br.top < vh * 0.6 && br.bottom > 0));
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener("resize", frame);
  frame();

  /* ============================================================
     SISTEMA DE RESERVAS
     ============================================================ */
  var DAY = 864e5;
  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var DOW = ["L","M","X","J","V","S","D"];
  var MAX_NOCHES = 30;

  var dn = function (y, m, d) { return Math.floor(Date.UTC(y, m, d) / DAY); };       // m = 0..11
  var fromDn = function (n) { return new Date(n * DAY); };                            // UTC
  var key = function (n) { return fromDn(n).toISOString().slice(0, 10); };
  var parseKey = function (k) { var p = k.split("-"); return dn(+p[0], +p[1] - 1, +p[2]); };
  var fmt = function (n) {
    var d = fromDn(n);
    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };
  var now = new Date();
  var TODAY = dn(now.getFullYear(), now.getMonth(), now.getDate());

  var busy = {};            // noches ocupadas: {dn:true}
  var apiOk = false;
  var st = { start: null, end: null, hover: null, vy: now.getFullYear(), vm: now.getMonth() };

  var elGrids = $("#calGrids"), elTitles = $("#calTitles"), elStatus = $("#calStatus");
  var prevBtn = $("#calPrev"), nextBtn = $("#calNext");
  var mqOne = window.matchMedia("(max-width: 640px)");

  function addRanges(list) {
    (list || []).forEach(function (r) {
      var a = parseKey(r.desde), b = parseKey(r.hasta);
      for (var n = a; n < b; n++) busy[n] = true;
    });
  }
  function allFree(a, b) { for (var n = a; n < b; n++) if (busy[n]) return false; return true; }

  function loadAvailability() {
    return fetch(C.apiBase + "/disponibilidad.php", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { if (!j || !j.ok) throw 0; apiOk = true; busy = {}; addRanges(j.ocupadas); })
      .catch(function () {
        apiOk = false;
        return fetch("js/ocupado-estatico.json", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (j) { busy = {}; addRanges(j.bloqueos); })
          .catch(function () { busy = {}; });
      })
      .then(renderCal);
  }

  function validEnd(s, e) {
    return e > s && (e - s) >= C.minNoches && (e - s) <= MAX_NOCHES && allFree(s, e);
  }
  function canPick(n) {
    if (n < TODAY) return false;
    if (st.start !== null && st.end === null) {
      if (n > st.start) return validEnd(st.start, n) || !busy[n];  // salida válida, o reiniciar en día libre
      return !busy[n];
    }
    return !busy[n];
  }

  function renderCal() {
    var count = mqOne.matches ? 1 : 2;
    elTitles.innerHTML = ""; elGrids.innerHTML = "";
    for (var k = 0; k < count; k++) {
      var y = st.vy, m = st.vm + k;
      if (m > 11) { y++; m -= 12; }
      var t = document.createElement("div"); t.textContent = MESES[m] + " " + y; elTitles.appendChild(t);

      var g = document.createElement("div"); g.className = "cal__grid";
      DOW.forEach(function (d) { var s = document.createElement("div"); s.className = "cal__dow"; s.textContent = d; g.appendChild(s); });
      var first = new Date(Date.UTC(y, m, 1)).getUTCDay();          // 0 = domingo
      var lead = (first + 6) % 7;
      for (var i = 0; i < lead; i++) g.appendChild(document.createElement("span"));
      var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (var d = 1; d <= days; d++) {
        var n = dn(y, m, d);
        var b = document.createElement("button");
        b.type = "button"; b.className = "day"; b.textContent = d; b.dataset.n = n;
        if (n < TODAY) b.classList.add("is-past");
        if (n === TODAY) b.classList.add("is-today");
        if (busy[n]) b.classList.add("is-busy");
        if (!canPick(n)) { b.disabled = true; }
        b.setAttribute("aria-label", fmt(n) + (busy[n] ? " (ocupado)" : ""));
        g.appendChild(b);
      }
      elGrids.appendChild(g);
    }
    // límites de navegación
    prevBtn.disabled = (st.vy === now.getFullYear() && st.vm === now.getMonth());
    var monthsAhead = (st.vy - now.getFullYear()) * 12 + st.vm - now.getMonth();
    nextBtn.disabled = monthsAhead >= 18;
    paint();
  }

  function paint() {
    var s = st.start, e = st.end !== null ? st.end : (st.hover !== null && st.start !== null && st.hover > st.start && validEnd(st.start, st.hover) ? st.hover : null);
    $$(".day", elGrids).forEach(function (b) {
      var n = +b.dataset.n;
      b.classList.remove("is-start", "is-end", "in-range", "has-range", "no-range");
      if (s !== null && n === s) { b.classList.add("is-start", e !== null ? "has-range" : "no-range"); }
      if (e !== null && n === e) b.classList.add("is-end");
      if (s !== null && e !== null && n > s && n < e) b.classList.add("in-range");
    });
    updateSummary();
  }

  elGrids.addEventListener("click", function (ev) {
    var b = ev.target.closest(".day"); if (!b || b.disabled) return;
    var n = +b.dataset.n;
    if (st.start === null || st.end !== null) { st.start = n; st.end = null; }
    else if (n > st.start && validEnd(st.start, n)) { st.end = n; }
    else { st.start = n; st.end = null; }
    st.hover = null;
    renderCal();
  });
  elGrids.addEventListener("mouseover", function (ev) {
    var b = ev.target.closest(".day");
    if (st.start === null || st.end !== null) return;
    var h = b && !b.disabled ? +b.dataset.n : null;
    if (h !== st.hover) { st.hover = h; paint(); }
  });
  elGrids.addEventListener("mouseleave", function () { if (st.hover !== null) { st.hover = null; paint(); } });
  prevBtn.addEventListener("click", function () { st.vm--; if (st.vm < 0) { st.vm = 11; st.vy--; } renderCal(); });
  nextBtn.addEventListener("click", function () { st.vm++; if (st.vm > 11) { st.vm = 0; st.vy++; } renderCal(); });
  mqOne.addEventListener("change", renderCal);

  /* ---------- resumen y precio ---------- */
  var form = $("#form"), guests = $("#personas");
  function nights() { return st.start !== null && st.end !== null ? st.end - st.start : 0; }
  function total() { return nights() * C.precioNoche; }   // precio fijo por noche, independiente de las personas

  function updateSummary() {
    var n = nights();
    $("#outIn").textContent = st.start !== null ? fmt(st.start) : "—";
    $("#outOut").textContent = st.end !== null ? fmt(st.end) : "—";
    var sum = $("#summary");
    if (n > 0) {
      var t = total();
      sum.hidden = false;
      $("#sumNights").textContent = n + (n === 1 ? " noche" : " noches") + " × " + eur(C.precioNoche);
      $("#sumTotal").textContent = eur(t);
      $("#sumDeposit").textContent = eur(Math.min(C.fianza, t));
      $("#sumRest").textContent = eur(Math.max(0, t - C.fianza));
      elStatus.textContent = "Del " + fmt(st.start) + " al " + fmt(st.end) + " · " + n + (n === 1 ? " noche" : " noches");
    } else {
      sum.hidden = true;
      elStatus.textContent = st.start !== null
        ? "Entrada: " + fmt(st.start) + ". Ahora elige el día de salida."
        : "Selecciona el día de entrada y luego el de salida.";
    }
  }
  guests.addEventListener("input", updateSummary);
  $("#gMinus").addEventListener("click", function () { guests.value = Math.max(1, (+guests.value || 1) - 1); updateSummary(); });
  $("#gPlus").addEventListener("click", function () { guests.value = Math.min(C.capacidad, (+guests.value || 1) + 1); updateSummary(); });

  /* ---------- envío ---------- */
  var errBox = $("#formError"), submitBtn = $("#submitBtn");
  function showError(msg, fields) {
    errBox.textContent = msg; errBox.hidden = false;
    $$(".bad", form).forEach(function (f) { f.classList.remove("bad"); });
    (fields || []).forEach(function (f) { f.classList.add("bad"); });
    errBox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
  var cleanPhone = function (v) { return v.replace(/[\s.\-()]/g, ""); };

  function waText(d) {
    return "Hola, quiero reservar Casa Portomeiro del " + fmt(d.start) + " al " + fmt(d.end) +
      " (" + d.noches + (d.noches === 1 ? " noche" : " noches") + ") para " + d.personas + (d.personas === 1 ? " persona" : " personas") +
      ". Me llamo " + d.nombre + " y mi teléfono es " + d.telefono +
      ". Precio estimado: " + eur(d.total) + ". ¿Me confirmas la disponibilidad y cómo hago la fianza de " + eur(C.fianza) + "?";
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    errBox.hidden = true;
    var f = form.elements;
    var nombre = f.nombre.value.trim(), tel = cleanPhone(f.telefono.value), email = f.email.value.trim();
    var per = +f.personas.value;

    if (st.start === null || st.end === null) return showError("Elige primero las fechas de entrada y salida en el calendario.");
    if (nombre.length < 2) return showError("Escribe tu nombre.", [f.nombre]);
    if (!/^\+?\d{9,15}$/.test(tel)) return showError("Escribe un teléfono válido para que la propietaria pueda contactarte por WhatsApp.", [f.telefono]);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError("El email no parece correcto.", [f.email]);
    if (!(per >= 1 && per <= C.capacidad)) return showError("El número de personas debe estar entre 1 y " + C.capacidad + ".", [f.personas]);
    if (!f.acepto.checked) return showError("Marca la casilla para aceptar las condiciones de la reserva.");

    var d = { start: st.start, end: st.end, noches: nights(), personas: per, nombre: nombre, telefono: f.telefono.value.trim(), total: total() };
    submitBtn.disabled = true;

    fetch(C.apiBase + "/reservar.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre, telefono: f.telefono.value.trim(), email: email, personas: per,
        entrada: key(st.start), salida: key(st.end), comentarios: f.comentarios.value.trim(),
        web: f.web.value, acepto: true
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    }).then(function (res) {
      if (res.body && res.body.ok) { showDone(d, "api"); return; }
      if (res.status === 409) { showError(res.body.error || "Esas fechas ya no están disponibles."); st.start = st.end = null; loadAvailability(); return; }
      if (res.status >= 400 && res.status < 500 && res.body && res.body.error) { showError(res.body.error); return; }
      throw 0;
    }).catch(function () {
      showDone(d, "wa");                          // sin backend: modo WhatsApp
    }).then(function () { submitBtn.disabled = false; });
  });

  function showDone(d, mode) {
    var wa = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(waText(d));
    $("#doneWa").href = wa;
    if (mode === "api") {
      $("#doneTitle").textContent = "¡Solicitud enviada!";
      $("#doneText").textContent = "Le hemos enviado tus datos a la propietaria. Te escribirá por WhatsApp al " + d.telefono + " para indicarte cómo enviar la fianza de " + eur(C.fianza) + ". Si quieres ir más rápido, avísala tú también:";
    } else {
      $("#doneTitle").textContent = "Un último paso";
      $("#doneText").textContent = "Pulsa el botón para enviar tu solicitud por WhatsApp a la propietaria. Ya lleva escritas tus fechas y tus datos; ella te responderá para la fianza de " + eur(C.fianza) + ".";
    }
    $("#doneSum").innerHTML =
      "<div><span>Entrada</span><b>" + fmt(d.start) + "</b></div>" +
      "<div><span>Salida</span><b>" + fmt(d.end) + "</b></div>" +
      "<div><span>Personas</span><b>" + d.personas + "</b></div>" +
      "<div><span>Total estimado</span><b>" + eur(d.total) + "</b></div>";
    form.hidden = true; $("#done").hidden = false;
    $("#done").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  $("#doneAgain").addEventListener("click", function () {
    $("#done").hidden = true; form.hidden = false; form.reset();
    st.start = st.end = null; loadAvailability();
  });

  loadAvailability();
})();
