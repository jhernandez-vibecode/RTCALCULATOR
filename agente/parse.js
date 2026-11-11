// agente/parse.js — reconoce los PDF de una emisión RT Construcción y lee los
// datos de la póliza de las Condiciones Particulares.
//
// Los nombres de archivo que entrega el INS (emisión real de sep 2026):
//   0410520_Constancia_Poliza_Vigente_Riesgos_del_Trabajo_20260917_131917.pdf
//   0410520_Condiciones_Particulares_Riesgos_del_Trabajo_20260917_131944.pdf
//   0410520_500_003_Condiciones_Especiales_RT_Construccion_20260917_131923.pdf
//   0410520_Perfeccionamiento_del_Contrato_RT_Construccion_20260917_131947.pdf
//   0410520_Carta_Bienvenida_Clientes_RT_20260917_131952.pdf
//   Comprobante De Pago.pdf
//   Condiciones Generales 2025 (26-08-2025).pdf
//   Norma Técnica 2025 (26-08-2025) V1 003.pdf
//   Manual de acceso al sistema RT Virtual - 003.pdf
window.RParse = (function () {
  // Orden en que van los adjuntos y la lista del correo. La constancia, primero:
  // es el documento del trámite municipal.
  const TIPOS = [
    { tipo: 'constancia',   nombre: 'Constancia de Póliza Vigente',            re: /constancia/i },
    { tipo: 'particulares', nombre: 'Condiciones Particulares',                re: /condiciones[\s_-]*particulares/i },
    { tipo: 'especiales',   nombre: 'Condiciones Especiales RT Construcción',  re: /condiciones[\s_-]*especiales/i },
    { tipo: 'perfecc',      nombre: 'Información previa al perfeccionamiento del contrato', re: /perfeccionamiento/i },
    { tipo: 'bienvenida',   nombre: 'Carta de bienvenida del INS',             re: /bienvenida/i },
    { tipo: 'comprobante',  nombre: 'Comprobante de pago',                     re: /comprobante|recibo/i },
    { tipo: 'generales',    nombre: 'Condiciones Generales 2025',              re: /condiciones[\s_-]*generales/i },
    { tipo: 'norma',        nombre: 'Norma Técnica 2025',                      re: /norma[\s_-]*t[eé]cnica/i },
    { tipo: 'manual',       nombre: 'Manual de acceso a RT Virtual',           re: /manual|rt[\s_-]*virtual/i }
  ];
  const ORDEN = TIPOS.map(t => t.tipo).concat(['otro']);

  function clasificar(nombreArchivo) {
    const n = String(nombreArchivo || '');
    for (const t of TIPOS) if (t.re.test(n)) return t;
    return { tipo: 'otro', nombre: n.replace(/\.pdf$/i, '') };
  }
  function polizaDeNombre(nombreArchivo) {
    const m = String(nombreArchivo || '').match(/^(\d{6,8})_/);
    return m ? m[1] : '';
  }

  // ----- texto del PDF (pdf.js pineado, igual que la consola de Viajero) -----
  async function leerTexto(file) {
    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      out += ' ' + tc.items.map(it => it.str).join(' ');
    }
    return out.replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
  }

  // Captura lo que hay entre una etiqueta y la siguiente. Las etiquetas del INS
  // terminan en ":" y el valor viene en mayúsculas.
  function entre(t, desde, hasta) {
    const m = t.match(new RegExp(desde + '\\s*:?\\s*(.*?)\\s*' + hasta, 'i'));
    return m ? m[1].trim() : '';
  }
  // "¢ 837 940" / "₡ 33 350" → 837940. El INS separa los miles con espacio.
  function monto(t, etiqueta) {
    const m = t.match(new RegExp(etiqueta + '\\s*:?\\s*[¢₡]?\\s*([\\d][\\d .]*\\d|\\d)', 'i'));
    return m ? Number(m[1].replace(/[^\d]/g, '')) : 0;
  }

  // Datos de la póliza. Solo de las Condiciones Particulares: es el documento
  // que trae todo junto (tomador, obra, monto, tarifa, prima, boleta).
  function extraer(t) {
    const d = {};
    d.poliza = (t.match(/N[úu]mero de p[óo]liza\s*:?\s*(\d{5,8})/i) || [])[1] || '';
    const v = t.match(/Vigencia\s*:?\s*Desde\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*Hasta\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
    d.desde = v ? v[1] : ''; d.hasta = v ? v[2] : '';
    d.tomador = entre(t, 'Nombre o raz[óo]n social', 'C[ée]dula');
    d.cedula = (t.match(/raz[óo]n social\s*:?.*?C[ée]dula\s*:?\s*([\dA-Z-]{9,14})/i) || [])[1] || '';
    d.telefono = (t.match(/Tel[ée]fono\s*:?\s*(\d{8})/i) || [])[1] || '';
    d.correo = (t.match(/Email\s*:?\s*([^\s@]+@[^\s@]+\.[a-z]{2,})/i) || [])[1] || '';
    d.lugar = entre(t, 'Lugar de los trabajos', 'Ubicaci[óo]n del patrono');
    const prov = entre(t, 'Provincia', 'Cant[óo]n'), canton = entre(t, 'Cant[óo]n', 'Distrito'),
          dist = entre(t, 'Distrito', 'Direcci[óo]n');
    d.ubicacion = [dist, canton, prov].filter(Boolean).map(titulo).join(', ');
    d.actividad = titulo(entre(t, 'Actividad Econ[óo]mica', 'C[óo]digo Actividad'));
    d.montoAsegurado = monto(t, 'TOTAL MONTO ASEGURADO');
    const ta = t.match(/TARIFA\s*:?\s*(\d+(?:[.,]\d+)?)\s*%/i);
    d.tarifa = ta ? ta[1].replace('.', ',') : '';
    d.prima = monto(t, 'TOTAL PAGADO') || monto(t, 'PRIMA');
    d.boleta = (t.match(/Boleta\s*(?:CFIA|municipal)?\s*:?\s*N?[°º]?\s*(\d{5,})/i) || [])[1] || '';
    return d;
  }

  // "GODINEZ ROJAS RODNEY" → "Godinez Rojas Rodney" (el INS no trae tildes).
  function titulo(s) {
    const menores = { de: 1, del: 1, la: 1, las: 1, los: 1, y: 1 };
    return String(s || '').toLowerCase().split(/\s+/).filter(Boolean)
      .map((w, i) => (i && menores[w]) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  // El INS escribe a la persona física APELLIDO APELLIDO NOMBRE(S). Para el
  // saludo se sugiere lo que viene después de los dos apellidos; el agente lo
  // corrige en la consola. Una sociedad (S.A., SRL, Ltda.) se saluda completa.
  function sugerirSaludo(tomador) {
    const t = String(tomador || '').trim();
    if (!t) return '';
    if (/\b(s\.?\s?a\.?|s\.?r\.?l\.?|ltda\.?|sociedad|limitada|asociaci[óo]n|fundaci[óo]n)\b/i.test(t)) return titulo(t);
    const p = t.split(/\s+/);
    return titulo(p.length >= 3 ? p.slice(2).join(' ') : p[0]);
  }
  function nombreOrdenado(tomador) {
    const t = String(tomador || '').trim();
    if (/\b(s\.?\s?a\.?|s\.?r\.?l\.?|ltda\.?|sociedad|limitada)\b/i.test(t)) return t;
    const p = t.split(/\s+/);
    return titulo(p.length >= 3 ? p.slice(2).concat(p.slice(0, 2)).join(' ') : t);
  }

  return { TIPOS, ORDEN, clasificar, polizaDeNombre, leerTexto, extraer, titulo, sugerirSaludo, nombreOrdenado };
})();
