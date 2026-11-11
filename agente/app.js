// agente/app.js — consola RT Construcción: Cotizar, Emitir, Historial.
(function () {
  const $ = id => document.getElementById(id);
  const fmt = n => '₡' + Math.round(Number(n) || 0).toLocaleString('de-DE');
  const num = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;
  const tarifaNum = s => Number(String(s || '').replace(',', '.')) || 0;
  const DEMO = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]demo=1/.test(location.search);
  let agente = null;

  // ---------------- entrada ----------------
  function perfil(email) {
    const p = VCfg.AGENTES[email];
    return p || { nombre: email, rol: 'Agente de Seguros Exclusivo · Instituto Nacional de Seguros', licencia: '', codigo: '', tel: '', whatsapp: '', correo: email, web: '' };
  }
  function entrar(email) {
    agente = perfil(email);
    $('who').innerHTML = '<strong>' + esc(agente.nombre) + '</strong>' + (agente.licencia ? ' · Agente exclusivo INS <span class="lic">SUGESE ' + esc(agente.licencia) + '</span>' : ' · ' + esc(email));
    $('gate').hidden = true; $('tabs').hidden = false;
    mostrar();
  }
  $('btn-login').addEventListener('click', async () => {
    $('gate-err').hidden = true;
    try {
      const r = await VAuth.signIn();
      if (!r.canSend) { $('gate-err').textContent = 'Entraste, pero Google no dio el permiso para enviar correos. Volvé a iniciar sesión y marcá la casilla «Enviar correo electrónico en tu nombre».'; $('gate-err').hidden = false; }
      entrar(r.email);
    } catch (e) { $('gate-err').textContent = e.message; $('gate-err').hidden = false; }
  });
  if (DEMO) entrar(VCfg.DEFAULT);

  function mostrar() {
    if (!agente) return;
    const v = (location.hash || '#cotizar').slice(1);
    ['cotizar', 'emitir', 'historial'].forEach(n => { $('v-' + n).hidden = n !== v; });
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === v));
    if (v === 'historial') pintarHistorial();
  }
  addEventListener('hashchange', mostrar);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function error(id, msg) { $(id).textContent = msg || ''; $(id).hidden = !msg; }
  const correoOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

  async function token() {
    if (DEMO) throw new Error('Modo de prueba local: el envío está apagado.');
    return VAuth.ensureToken();
  }
  function vistaPrevia(asunto, html) {
    $('prev-asunto').textContent = asunto;
    $('prev-frame').srcdoc = html;
    $('prev').showModal();
  }
  $('prev-cerrar').addEventListener('click', () => $('prev').close());

  // ---------------- historial (este navegador) ----------------
  const HKEY = 'rt_consola_historial';
  function hist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
  function anotar(item) { try { const h = hist(); h.unshift(Object.assign({ fecha: new Date().toISOString() }, item)); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 300))); } catch (e) { /* sin almacenamiento: no pasa nada */ } }
  function pintarHistorial() {
    const h = hist();
    $('hist').innerHTML = h.length ? h.map(x => '<div class="hist-row"><span class="f">' + new Date(x.fecha).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) + '</span>' +
      '<span class="lc-chip">' + (x.tipo === 'emision' ? 'Emisión' : 'Cotización') + '</span>' +
      '<span>' + esc(x.cliente) + ' · <span class="f">' + esc(x.correo) + '</span></span>' +
      '<span class="lc-amt-sm">' + (x.poliza ? 'Póliza ' + esc(x.poliza) : fmt(x.prima)) + '</span></div>').join('')
      : '<p class="hist-vacio">Todavía no hay envíos desde este navegador.</p>';
  }

  // ================= COTIZAR =================
  let sociedad = false, saludoTocado = false;
  $('cz-tarifa').value = String(VCfg.TARIFA_DEFAULT).replace('.', ',');
  function cotizacion() {
    const valorObra = num($('cz-obra').value);
    const tarifa = tarifaNum($('cz-tarifa').value);
    const montoAsegurado = Math.round(valorObra * VCfg.PCT_ASEGURADO);
    const prima = Math.round(montoAsegurado * tarifa / 100);
    return { nombre: $('cz-nombre').value.trim(), saludo: $('cz-saludo').value.trim(), correo: $('cz-correo').value.trim(), tel: $('cz-tel').value.trim(), valorObra, montoAsegurado, tarifa, prima, sociedad };
  }
  function recalcular() {
    const c = cotizacion();
    $('cz-prima').textContent = fmt(c.prima); $('cz-r-prima').textContent = fmt(c.prima);
    $('cz-r-obra').textContent = fmt(c.valorObra); $('cz-r-aseg').textContent = fmt(c.montoAsegurado);
    $('cz-estado-tarifa').textContent = 'Tarifa ' + String(c.tarifa).replace('.', ',') + ' %';
  }
  $('cz-obra').addEventListener('input', e => {
    const n = num(e.target.value);
    e.target.value = n ? '₡ ' + n.toLocaleString('de-DE') : '';
    recalcular();
  });
  $('cz-tarifa').addEventListener('input', recalcular);
  $('cz-nombre').addEventListener('input', () => { if (!saludoTocado) $('cz-saludo').value = ($('cz-nombre').value.trim().split(/\s+/)[0] || ''); });
  $('cz-saludo').addEventListener('input', () => { saludoTocado = !!$('cz-saludo').value; });
  document.querySelectorAll('[data-soc]').forEach(b => b.addEventListener('click', () => {
    sociedad = b.dataset.soc === '1';
    document.querySelectorAll('[data-soc]').forEach(x => x.classList.toggle('on', x === b));
  }));
  recalcular();

  function validarCotizacion(c) {
    if (!c.nombre) return 'Falta el nombre del cliente.';
    if (!correoOk(c.correo)) return 'Revisá el correo del cliente.';
    if (!c.valorObra) return 'Falta el valor de la obra.';
    if (!(c.tarifa > 0 && c.tarifa < 20)) return 'Revisá la tarifa.';
    return '';
  }
  const asuntoCot = () => 'Cotización · Seguro de Riesgos del Trabajo para su obra';
  function htmlCot(c) { return REmail.htmlCotizacion(Object.assign({}, c, { saludo: c.saludo || c.nombre }), agente); }
  $('cz-ver').addEventListener('click', () => {
    const c = cotizacion(); const m = c.valorObra ? '' : 'Escribí el valor de la obra para ver el correo.';
    error('cz-err', m); if (!m) vistaPrevia(asuntoCot(), htmlCot(c));
  });
  $('cz-enviar').addEventListener('click', async () => {
    const c = cotizacion(), m = validarCotizacion(c);
    error('cz-err', m); if (m) return;
    const b = $('cz-enviar'); b.disabled = true; b.textContent = 'Enviando…';
    try {
      await REmail.enviar({ to: c.correo, cc: agente.correo, asunto: asuntoCot(), html: htmlCot(c) }, await token());
      anotar({ tipo: 'cotizacion', cliente: c.nombre, correo: c.correo, prima: c.prima });
      $('cz-form').hidden = true;
      $('cz-hecho').innerHTML = '<span class="lc-state">Cotización enviada</span><h2>Le llegó a ' + esc(c.nombre) + '</h2><p>Prima ' + fmt(c.prima) + ' sobre una obra de ' + fmt(c.valorObra) + '. Enviado a <b>' + esc(c.correo) + '</b> con copia para vos, a las ' + new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }) + '.</p><div class="acts"><button type="button" class="lc-pill lc-pill-fill" id="cz-otra">Cotizar a otro cliente</button></div>';
      $('cz-hecho').hidden = false;
      $('cz-otra').addEventListener('click', limpiarCot);
    } catch (e) { error('cz-err', 'No se envió: ' + e.message); }
    b.disabled = false; b.textContent = 'Enviar cotización';
  });
  function limpiarCot() {
    ['cz-nombre', 'cz-saludo', 'cz-correo', 'cz-tel', 'cz-obra'].forEach(id => { $(id).value = ''; });
    saludoTocado = false; $('cz-tarifa').value = String(VCfg.TARIFA_DEFAULT).replace('.', ',');
    recalcular(); $('cz-hecho').hidden = true; $('cz-form').hidden = false; error('cz-err', '');
  }

  // ================= EMITIR =================
  // docs: [{ tipo, nombre (legible), archivo (nombre del PDF), file | path, fijo }]
  let docs = [], fijosDisponibles = {};
  const NOTAS = {
    constancia: 'Para el trámite municipal',
    particulares: 'Datos de su póliza, monto asegurado y prima',
    especiales: 'Las reglas propias de esta póliza (planillas, extensión, terminación)',
    manual: 'Para reportar un accidente'
  };

  // ¿Están los 3 documentos generales en el sitio? Se revisa una vez.
  Promise.all(VCfg.DOCS_FIJOS.map(d => fetch(d.path, { method: 'HEAD', cache: 'no-store' })
    .then(r => { fijosDisponibles[d.tipo] = r.ok && !/text\/html/i.test(r.headers.get('content-type') || ''); })
    .catch(() => { fijosDisponibles[d.tipo] = false; }))).then(pintarDocs);

  function listaFinal() {
    const propios = docs.slice();
    for (const f of VCfg.DOCS_FIJOS) {
      if (propios.some(d => d.tipo === f.tipo)) continue;    // el agente trajo el suyo: no se duplica
      const t = RParse.TIPOS.find(x => x.tipo === f.tipo);
      propios.push({ tipo: f.tipo, nombre: t.nombre, archivo: f.nombre, path: f.path, fijo: true, falta: !fijosDisponibles[f.tipo] });
    }
    return propios.sort((a, b) => RParse.ORDEN.indexOf(a.tipo) - RParse.ORDEN.indexOf(b.tipo));
  }

  function pintarDocs() {
    const l = listaFinal(), propios = l.filter(d => !d.fijo), fijos = l.filter(d => d.fijo);
    const listos = l.filter(d => !d.falta).length;
    $('em-cuenta').textContent = propios.length ? listos + ' adjuntos listos' : 'Documentos de la emisión';
    const fila = (d, i) => '<div class="doc"><span class="ok' + (d.falta ? ' falta' : '') + '"></span><span class="nm">' + esc(d.nombre) +
      (d.fijo ? '' : '<span class="fn">' + esc(d.archivo) + '</span>') + '</span>' +
      (d.tipo === 'constancia' ? '<span class="lc-chip">Trámite municipal</span>' : '') +
      (d.tipo === 'particulares' && datosLeidos ? '<span class="tag">datos leídos</span>' : '') +
      (d.fijo ? '<span class="tag">' + (d.falta ? 'falta subirlo al sitio' : 'fijo') + '</span>' : '<button type="button" class="x" data-quitar="' + i + '" title="Quitar">Quitar</button>') + '</div>';
    let html = '';
    if (propios.length) html += '<div class="grp">DE ESTA PÓLIZA</div>' + propios.map(d => fila(d, docs.indexOf(d))).join('');
    const falta = ['constancia', 'particulares', 'especiales'].filter(t => propios.length && !propios.some(d => d.tipo === t));
    if (falta.length) html += '<div class="doc"><span class="ok falta"></span><span class="nm">Falta: ' + falta.map(t => RParse.TIPOS.find(x => x.tipo === t).nombre).join(', ') + '</span></div>';
    html += '<div class="grp">GENERALES · VAN SIEMPRE</div>' + fijos.map(d => fila(d, -1)).join('');
    $('em-docs').innerHTML = html;
    $('em-docs').querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => { docs.splice(+b.dataset.quitar, 1); pintarDocs(); }));
  }

  let datosLeidos = false;
  async function recibir(archivos) {
    error('em-err', '');
    $('em-progreso').hidden = false; $('em-progreso').textContent = 'Abriendo archivos…';
    let lista;
    try { lista = await VZip.expandir(archivos, p => { $('em-progreso').textContent = p.etapa; }); }
    catch (e) { $('em-progreso').hidden = true; return error('em-err', e.message); }
    const zips = archivos.filter(VZip.esZip).map(f => f.name);
    const pdfs = lista.filter(f => /\.pdf$/i.test(f.name));
    const ignorados = lista.length - pdfs.length;
    for (const f of pdfs) {
      const t = RParse.clasificar(f.name);
      const ya = docs.findIndex(d => d.tipo === t.tipo && t.tipo !== 'otro');
      const item = { tipo: t.tipo, nombre: t.nombre, archivo: f.name, file: f };
      if (ya >= 0) docs[ya] = item; else if (!docs.some(d => d.archivo === f.name && d.file && d.file.size === f.size)) docs.push(item);
    }
    $('em-progreso').textContent = (zips.length ? 'Se abrió ' + zips.join(', ') + ' · ' : '') + pdfs.length + ' PDF reconocidos' + (ignorados ? ' · ' + ignorados + ' archivo(s) que no son PDF quedaron fuera' : '');
    const part = docs.find(d => d.tipo === 'particulares');
    if (part && !datosLeidos) {
      try {
        const d = RParse.extraer(await RParse.leerTexto(part.file));
        llenar(d); datosLeidos = true;
      } catch (e) { error('em-err', 'No se pudieron leer las Condiciones Particulares: escribí los datos a mano. (' + e.message + ')'); }
    }
    if (!$('em-poliza').value) { const p = docs.map(d => RParse.polizaDeNombre(d.archivo)).find(Boolean); if (p) $('em-poliza').value = p; }
    pintarDocs(); estadoEmision();
  }
  function llenar(d) {
    const set = (id, v) => { if (v && !$(id).value) $(id).value = v; };
    set('em-tomador', RParse.nombreOrdenado(d.tomador));
    set('em-saludo', RParse.sugerirSaludo(d.tomador));
    set('em-correo', (d.correo || '').toLowerCase());
    set('em-poliza', d.poliza); set('em-boleta', d.boleta);
    set('em-desde', d.desde); set('em-hasta', d.hasta);
    set('em-lugar', d.ubicacion || RParse.titulo(d.lugar));
    if (d.montoAsegurado) set('em-monto', fmt(d.montoAsegurado));
    if (d.prima) set('em-prima', fmt(d.prima));
    $('em-actividad').textContent = [d.actividad ? 'Actividad: ' + d.actividad : '', d.tarifa ? 'Tarifa ' + d.tarifa + ' %' : '', d.telefono ? 'Tel. ' + d.telefono : ''].filter(Boolean).join(' · ');
  }
  ['em-monto', 'em-prima'].forEach(id => $(id).addEventListener('change', e => { const n = num(e.target.value); e.target.value = n ? fmt(n) : ''; }));
  function estadoEmision() { $('em-estado').hidden = !(datosLeidos && docs.some(d => d.tipo === 'constancia')); }

  // Arrastrar: copiar SINCRÓNICAMENTE antes del primer await (lección de zip.js).
  const drop = $('em-drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    const entradas = VZip.entradasDe(e.dataTransfer);
    const sueltos = Array.from(e.dataTransfer.files || []);
    if (VZip.hayCarpetas(entradas)) VZip.desdeEntradas(entradas).then(recibir);
    else if (sueltos.length) recibir(sueltos);
    else error('em-err', 'No llegó ningún archivo. Si los arrastraste desde adentro de un ZIP abierto en el Explorador de Windows, Windows no se los entrega al navegador: arrastrá el ZIP entero.');
  });
  $('em-btn-arch').addEventListener('click', () => $('em-in-arch').click());
  $('em-btn-carp').addEventListener('click', () => $('em-in-carp').click());
  ['em-in-arch', 'em-in-carp'].forEach(id => $(id).addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) recibir(f); }));

  function emision() {
    return {
      tomador: $('em-tomador').value.trim(), saludo: $('em-saludo').value.trim(), correo: $('em-correo').value.trim(),
      poliza: $('em-poliza').value.trim(), boleta: $('em-boleta').value.trim(),
      desde: $('em-desde').value.trim(), hasta: $('em-hasta').value.trim(), lugar: $('em-lugar').value.trim(),
      montoAsegurado: num($('em-monto').value), prima: num($('em-prima').value)
    };
  }
  function docsCorreo(l) {
    return l.filter(d => !d.falta).map(d => ({ nombre: d.nombre, nota: NOTAS[d.tipo] || '', destacar: d.tipo === 'constancia' }));
  }
  const asuntoEm = e => 'Su póliza de Riesgos del Trabajo · Construcción está activa · ' + e.poliza;
  function htmlEm(e, l) {
    const c = l.find(d => d.tipo === 'constancia');
    return REmail.htmlEmision(Object.assign({}, e, { constanciaArchivo: c ? c.archivo : '' }), docsCorreo(l), agente);
  }
  function validarEmision(e, l) {
    // El correo dice «el manual va adjunto»: sin los generales no se manda.
    if (l.some(d => d.falta)) return 'Faltan documentos generales en el sitio (' + l.filter(d => d.falta).map(d => d.nombre).join(', ') + '). Arrastralos junto con la emisión o subilos a agente/docs.';
    if (!l.some(d => d.tipo === 'constancia')) return 'Falta la Constancia de Póliza Vigente: es el documento del trámite municipal.';
    if (!correoOk(e.correo)) return 'Revisá el correo del cliente.';
    if (!e.poliza) return 'Falta el número de póliza.';
    if (!e.desde || !e.hasta) return 'Falta la vigencia de la póliza.';
    return '';
  }
  $('em-ver').addEventListener('click', () => { const e = emision(); vistaPrevia(asuntoEm(e), htmlEm(e, listaFinal())); });
  $('em-enviar').addEventListener('click', async () => {
    const e = emision(), l = listaFinal(), m = validarEmision(e, l);
    error('em-err', m); if (m) return;
    const b = $('em-enviar'); b.disabled = true; b.textContent = 'Preparando adjuntos…';
    try {
      const enviar = l.filter(d => !d.falta);
      const adjuntos = [];
      for (const d of enviar) {
        let b64;
        if (d.file) b64 = await REmail.fileToB64(d.file);
        else { const r = await fetch(d.path); if (!r.ok) throw new Error('no se pudo cargar ' + d.archivo); b64 = await REmail.fileToB64(await r.blob()); }
        adjuntos.push({ nombre: d.archivo, b64 });
      }
      b.textContent = 'Enviando…';
      await REmail.enviar({ to: e.correo, cc: agente.correo, asunto: asuntoEm(e), html: htmlEm(e, l), adjuntos }, await token());
      anotar({ tipo: 'emision', cliente: e.tomador, correo: e.correo, poliza: e.poliza });
      $('em-form').hidden = true;
      $('em-hecho').innerHTML = '<span class="lc-state">Emisión enviada</span><h2>Póliza ' + esc(e.poliza) + ' entregada</h2><p>Le llegó a <b>' + esc(e.correo) + '</b> con ' + adjuntos.length + ' adjuntos, con copia para vos, a las ' + new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }) + '.</p><div class="acts"><button type="button" class="lc-pill lc-pill-fill" id="em-otra">Enviar otra emisión</button></div>';
      $('em-hecho').hidden = false;
      $('em-otra').addEventListener('click', limpiarEm);
    } catch (err) { error('em-err', 'No se envió: ' + err.message); }
    b.disabled = false; b.textContent = 'Enviar emisión';
  });
  function limpiarEm() {
    docs = []; datosLeidos = false;
    ['em-tomador', 'em-saludo', 'em-correo', 'em-poliza', 'em-boleta', 'em-desde', 'em-hasta', 'em-lugar', 'em-monto', 'em-prima'].forEach(id => { $(id).value = ''; });
    $('em-actividad').textContent = ''; $('em-progreso').hidden = true; error('em-err', '');
    $('em-hecho').hidden = true; $('em-form').hidden = false; pintarDocs(); estadoEmision();
  }
  $('em-limpiar').addEventListener('click', () => { if (!docs.length || confirm('¿Borrar los documentos y los datos cargados?')) limpiarEm(); });
})();
