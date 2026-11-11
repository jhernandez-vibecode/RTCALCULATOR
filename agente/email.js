// agente/email.js — los dos correos al cliente (cotización y emisión) y el envío
// por Gmail API con la cuenta del agente.
//
// Línea clara en correo = solo la forma (regla del kit SDI): Gmail y Outlook no
// cargan webfonts, así que todo va en Arial y las cifras en Courier New (el ₡ de
// Arial se monta). Tablas, estilos en línea, sin imágenes salvo los dos logos
// hosteados. Mockup aprobado por JC el 11 nov 2026:
// docs/mockups/2026-11-11-consola-agente/.
window.REmail = (function () {
  const INK = '#1B1F23', INK2 = '#3C4650', GRIS = '#5A6570', GRIS3 = '#6B7681',
        LINEA = '#DADCE0', LINEA2 = '#EDEFF2', BANDA = '#EEF4F9', AZUL = '#0369A1',
        NARANJA = '#EA580C', DURAZNO = '#FDF0E7', DURAZNO_B = '#F6D3BC',
        OK_BG = '#E9F5F0', OK_TX = '#037D61';
  const F = 'Arial,Helvetica,sans-serif', MONO = "'Courier New',Courier,monospace";

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Punto de miles (regla 8 del kit: de-DE, no es-CR).
  function col(n) { return '&#8353;' + Math.round(Number(n) || 0).toLocaleString('de-DE'); }

  // ---------- piezas comunes ----------
  function marco(cuerpo, titulo) {
    return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + esc(titulo) + '</title></head>' +
      '<body style="margin:0;padding:0;background:#F1F3F4;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F3F4;"><tr><td align="center" style="padding:28px 12px 40px;">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:24px;font-family:' + F + ';color:' + INK + ';">' +
      cuerpo + '</table></td></tr></table></body></html>';
  }
  function cabecera() {
    return '<tr><td style="padding:30px 36px 22px;"><img src="' + esc(VCfg.LOGO_INS_URL) + '" alt="INS" height="34" style="display:block;height:34px;border:0;outline:none;text-decoration:none;"></td></tr>' +
      '<tr><td style="padding:0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      ['#0369A1', '#0D9488', '#EA580C', '#C9A227'].map(c => '<td height="4" style="height:4px;background:' + c + ';font-size:0;line-height:0;">&nbsp;</td>').join('') +
      '</tr></table></td></tr>';
  }
  function kicker(t, mt) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:' + (mt || 0) + 'px;"><tr><td style="width:28px;height:3px;background:' + NARANJA + ';border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table>' +
      '<p style="margin:10px 0 0;font-size:12px;font-weight:bold;color:' + GRIS3 + ';letter-spacing:.02em;">' + t + '</p>';
  }
  function h2(t) { return '<p style="margin:30px 0 8px;font-size:19px;color:' + INK + ';">' + t + '</p>'; }
  function punto(titulo, texto, ref) {
    return '<tr><td width="20" valign="top" style="padding:13px 0;border-bottom:1px solid ' + LINEA2 + ';">' +
      '<div style="width:8px;height:8px;border-radius:4px;background:' + NARANJA + ';margin-top:6px;font-size:0;line-height:0;">&nbsp;</div></td>' +
      '<td valign="top" style="padding:12px 0;border-bottom:1px solid ' + LINEA2 + ';font-size:14.5px;line-height:1.55;color:' + INK2 + ';">' +
      '<b style="color:' + INK + ';">' + titulo + '</b> ' + texto +
      (ref ? '<br><span style="font-size:12px;color:' + GRIS3 + ';">' + ref + '</span>' : '') + '</td></tr>';
  }
  function listaPuntos(filas) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + filas.join('') + '</table>'; }
  function tablaDatos(filas) {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' + LINEA + ';border-radius:20px;border-collapse:separate;margin:8px 0 26px;">' +
      filas.map((f, i) => {
        const ult = i === filas.length - 1, bg = f.tot ? 'background:' + BANDA + ';' : '';
        const rad = ult ? 'border-radius:0 0 20px 20px;' : '';
        const bd = ult ? '' : 'border-bottom:1px solid ' + LINEA2 + ';';
        return '<tr><td style="padding:13px 18px;font-size:14px;color:' + (f.tot ? INK : GRIS) + ';' + (f.tot ? 'font-weight:bold;' : '') + bg + bd + (ult ? 'border-radius:0 0 0 20px;' : '') + '">' + f.k + '</td>' +
          '<td align="right" style="padding:13px 18px;font-size:14px;font-weight:bold;color:' + INK + ';font-family:' + (f.texto ? F : MONO) + ';' + bg + bd + (ult ? 'border-radius:0 0 20px 0;' : '') + '">' + f.v + '</td></tr>';
      }).join('') + '</table>';
  }
  function boton(texto, href) {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 0 28px;">' +
      '<a href="' + esc(href) + '" style="display:inline-block;background:' + AZUL + ';color:#ffffff;text-decoration:none;font-family:' + F + ';font-weight:bold;font-size:15px;padding:14px 30px;border-radius:999px;">' + texto + '</a></td></tr></table>';
  }
  function firma(A) {
    return '<tr><td style="padding:26px 36px;border-top:1px solid ' + LINEA2 + ';font-size:13px;line-height:1.6;color:' + GRIS + ';">' +
      '<b style="color:' + INK + ';font-size:14.5px;">' + esc(A.nombre) + '</b><br>' + esc(A.rol || 'Agente de Seguros Exclusivo · Instituto Nacional de Seguros') + '<br>' +
      '<span style="font-family:' + MONO + ';font-size:12px;">Licencia SUGESE ' + esc(A.licencia || '') + (A.codigo ? ' &middot; C&oacute;digo ' + esc(A.codigo) : '') + '</span><br>' +
      [A.tel ? 'WhatsApp ' + esc(A.tel) : '', esc(A.correo || ''), esc(A.web || '')].filter(Boolean).join(' &middot; ') + '</td></tr>' +
      '<tr><td align="center" style="background:' + BANDA + ';padding:22px 36px;border-radius:0 0 24px 24px;font-size:11.5px;color:' + GRIS3 + ';">' +
      '<img src="' + esc(VCfg.LOGO_SDI_URL) + '" alt="SDI Seguros Digitales INS" height="30" style="display:block;margin:0 auto 8px;height:30px;border:0;">' +
      'SDI Seguros Digitales INS &mdash; Todos los derechos reservados</td></tr>';
  }
  function waLink(A, texto) {
    return 'https://wa.me/' + String(A.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
  }

  // ---------- correo de COTIZACIÓN ----------
  // c = { saludo, valorObra, montoAsegurado, tarifa (número), prima, sociedad }
  function htmlCotizacion(c, A) {
    const tarifaTxt = String(c.tarifa).replace('.', ',') + ' %';
    const req = [
      { t: 'La solicitud del seguro, firmada', s: 'Firma digital o a mano &middot; <a href="' + esc(VCfg.SOLICITUD_URL) + '" style="color:' + AZUL + ';font-weight:bold;">Descargar la solicitud</a>' },
      { t: 'La boleta del CFIA o de la Municipalidad', s: 'Con los datos de la obra' }
    ];
    if (c.sociedad) req.push({ t: 'Copia de la personer&iacute;a jur&iacute;dica', s: 'Porque el tomador es una sociedad' });
    req.push({ t: 'El pago', s: 'Dep&oacute;sito a las <a href="' + esc(VCfg.CUENTAS_URL) + '" style="color:' + AZUL + ';font-weight:bold;">cuentas del INS</a> o enlace de pago con tarjeta' });
    const reqHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + req.map((r, i) =>
      '<tr><td width="30" valign="top" style="padding:12px 0;border-bottom:1px solid ' + LINEA2 + ';font-family:' + MONO + ';font-size:13px;color:' + GRIS3 + ';">0' + (i + 1) + '</td>' +
      '<td valign="top" style="padding:11px 0;border-bottom:1px solid ' + LINEA2 + ';font-size:14px;color:' + INK + ';">' + r.t + '<br><span style="font-size:12.5px;color:' + GRIS3 + ';">' + r.s + '</span></td></tr>').join('') + '</table>';

    const cuerpo = cabecera() +
      '<tr><td style="padding:30px 36px 8px;">' +
      kicker('RIESGOS DEL TRABAJO &middot; CONSTRUCCI&Oacute;N') +
      '<p style="margin:8px 0 12px;font-size:26px;line-height:1.2;color:' + INK + ';">Su cotizaci&oacute;n, ' + esc(c.saludo) + '</p>' +
      '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:' + INK2 + ';">Este es el seguro que pide la Municipalidad para dar el permiso de construcci&oacute;n. Protege a quienes trabajen en su obra.</p>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:22px 0 8px;">' +
      '<span style="font-size:12.5px;color:' + GRIS3 + ';">Prima a pagar &middot; pago &uacute;nico</span><br>' +
      '<span style="font-family:' + MONO + ';font-size:38px;font-weight:bold;color:' + INK + ';line-height:1.3;">' + col(c.prima) + '</span><br>' +
      '<span style="font-size:12.5px;color:' + GRIS3 + ';">V&aacute;lida por ' + VCfg.VALIDEZ_DIAS + ' d&iacute;as</span></td></tr></table>' +
      tablaDatos([
        { k: 'Valor de la obra', v: col(c.valorObra) },
        { k: 'Monto asegurado (35 % de la obra)', v: col(c.montoAsegurado) },
        { k: 'Tarifa', v: tarifaTxt },
        { k: 'Prima', v: col(c.prima), tot: true }
      ]) +
      h2('Lo bueno de esta p&oacute;liza') +
      listaPuntos([
        punto('No presenta planillas.', 'No tiene que reportar trabajadores ni planillas durante la obra.'),
        punto('Un solo pago', 'por todo el tiempo de la obra, sin cuotas.'),
        punto('Si la obra se alarga,', 'se extiende la p&oacute;liza mientras el permiso siga vigente.')
      ]) +
      h2('Para emitirla necesito') + reqHtml +
      '<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:' + GRIS3 + ';">Al quedar emitida le env&iacute;o la Constancia de P&oacute;liza Vigente, que es el documento para el tr&aacute;mite municipal.</p>' +
      boton('Quiero emitirla', waLink(A, 'Hola, recibí la cotización del seguro de Riesgos del Trabajo para mi obra y quiero emitirla.')) +
      '</td></tr>' + firma(A);
    return marco(cuerpo, 'Cotización Riesgos del Trabajo · Construcción');
  }

  // ---------- correo de EMISIÓN ----------
  // e = { saludo, poliza, desde, hasta, lugar, montoAsegurado, prima, constanciaArchivo }
  // docs = [{ nombre, nota, destacar }] en el orden de los adjuntos
  function htmlEmision(e, docs, A) {
    const filas = [
      { k: 'P&oacute;liza', v: esc(e.poliza) },
      { k: 'Vigencia', v: esc(e.desde) + ' al ' + esc(e.hasta) }
    ];
    if (e.lugar) filas.push({ k: 'Lugar de la obra', v: esc(e.lugar), texto: true });
    if (e.montoAsegurado) filas.push({ k: 'Monto asegurado', v: col(e.montoAsegurado) });
    if (e.prima) filas.push({ k: 'Prima pagada', v: col(e.prima), tot: true });

    const iso = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 6px;border-collapse:separate;"><tr>' +
      '<td style="background:' + DURAZNO + ';border:1px solid ' + DURAZNO_B + ';border-radius:20px;padding:20px 22px;">' +
      '<span style="font-size:12px;font-weight:bold;color:' + GRIS3 + ';letter-spacing:.02em;">EL DOCUMENTO QUE VA A LA MUNICIPALIDAD</span><br>' +
      '<span style="display:block;font-size:18px;color:' + INK + ';margin:6px 0 6px;">Constancia de P&oacute;liza Vigente</span>' +
      (e.constanciaArchivo ? '<span style="font-family:' + MONO + ';font-size:12px;color:' + GRIS + ';">' + esc(e.constanciaArchivo) + '</span><br>' : '') +
      '<span style="display:block;font-size:14px;line-height:1.55;color:' + INK2 + ';margin-top:10px;">Este es el que presenta en la Municipalidad para el tr&aacute;mite del permiso. Los dem&aacute;s documentos son para que usted los guarde.</span>' +
      '</td></tr></table>';

    const docsHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + docs.map((d, i) => {
      const bg = d.destacar ? 'background:' + DURAZNO + ';' : '';
      const n = (i + 1 < 10 ? '0' : '') + (i + 1);
      return '<tr><td width="34" valign="top" style="padding:11px 0 11px ' + (d.destacar ? '10px' : '0') + ';border-bottom:1px solid ' + LINEA2 + ';font-family:' + MONO + ';font-size:13px;color:' + GRIS3 + ';' + bg + '">' + n + '</td>' +
        '<td valign="top" style="padding:11px 0;border-bottom:1px solid ' + LINEA2 + ';font-size:14px;color:' + INK + ';' + bg + '">' +
        (d.destacar ? '<b>' + esc(d.nombre) + '</b>' : esc(d.nombre)) +
        (d.nota ? '<br><span style="font-size:12.5px;color:' + GRIS3 + ';">' + esc(d.nota) + '</span>' : '') + '</td></tr>';
    }).join('') + '</table>';

    const cuerpo = cabecera() +
      '<tr><td style="padding:30px 36px 8px;">' +
      '<span style="display:inline-block;background:' + OK_BG + ';color:' + OK_TX + ';font-size:12.5px;font-weight:bold;padding:6px 14px;border-radius:999px;margin-bottom:16px;">&#9679; P&oacute;liza activa</span>' +
      kicker('RIESGOS DEL TRABAJO &middot; CONSTRUCCI&Oacute;N') +
      '<p style="margin:8px 0 12px;font-size:26px;line-height:1.2;color:' + INK + ';">Su obra ya est&aacute; asegurada' + (e.saludo ? ', ' + esc(e.saludo) : '') + '</p>' +
      '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:' + INK2 + ';">Le adjunto los documentos de su p&oacute;liza. Abajo le resumo lo m&aacute;s importante para que no tenga que leerlos todos.</p>' +
      tablaDatos(filas) +
      kicker('PARA EL PERMISO DE CONSTRUCCI&Oacute;N') + iso +
      h2('Lo que debe saber de su p&oacute;liza') +
      listaPuntos([
        punto('No tiene que presentar planillas.', 'Esta p&oacute;liza est&aacute; exonerada de reportar planillas y de incluir trabajadores nuevos.', 'Condiciones Especiales, punto 2.b'),
        punto('No se renueva.', 'Si la obra se atrasa, av&iacute;seme antes del ' + esc(e.hasta) + ' para pedir la extensi&oacute;n; se necesita el permiso vigente y copia de la bit&aacute;cora.', 'Condiciones Especiales, punto 5'),
        punto('Usted como due&ntilde;o no est&aacute; cubierto.', 'La p&oacute;liza protege a las personas que trabajan en la obra.', 'Condiciones Especiales, punto 2.a'),
        punto('La prima no se devuelve al terminar antes.', 'Solo hay devoluci&oacute;n si la obra no se llega a construir, con la anulaci&oacute;n del permiso.', 'Condiciones Especiales, puntos 3 y 9')
      ]) +
      h2('Si un trabajador se accidenta') +
      listaPuntos([
        punto('Rep&oacute;rtelo en los 8 d&iacute;as h&aacute;biles siguientes', 'con el &laquo;Aviso de accidente&raquo; en RT Virtual (el manual va adjunto) o escr&iacute;bame y lo hacemos juntos.'),
        punto('El trabajador se atiende en el centro de salud del INS', 'm&aacute;s cercano a la obra o a su casa.')
      ]) +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;border-collapse:separate;"><tr><td style="background:' + BANDA + ';border-radius:20px;padding:20px 22px;">' +
      '<span style="font-size:12px;font-weight:bold;color:' + GRIS3 + ';">CONSULTAS DEL INS</span><br>' +
      '<span style="display:block;font-family:' + MONO + ';font-size:20px;font-weight:bold;color:' + INK + ';margin-top:6px;">' + esc(VCfg.INS_TEL) + '</span>' +
      '<span style="font-size:12.5px;color:' + GRIS + ';">800-TeleINS &middot; WhatsApp KAL ' + esc(VCfg.INS_KAL) + '</span></td></tr></table>' +
      h2('Documentos adjuntos') + docsHtml +
      boton('Escribirme por WhatsApp', waLink(A, 'Hola, recibí los documentos de mi póliza de Riesgos del Trabajo ' + e.poliza + ' y tengo una consulta.')) +
      '</td></tr>' + firma(A);
    return marco(cuerpo, 'Su póliza de Riesgos del Trabajo');
  }

  // ---------- envío ----------
  function abToB64(buf) {
    let bin = ''; const bytes = new Uint8Array(buf), chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }
  function encabezado(s) { return /[^\x20-\x7E]/.test(s) ? '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=' : s; }
  // Base64 del HTML en líneas de 76: así no hay que preocuparse por líneas largas
  // ni por los acentos (7bit con UTF-8 crudo puede romperse en Outlook).
  function b64Lineas(b64) { return b64.replace(/(.{76})/g, '$1\r\n'); }
  function utf8B64(str) { return btoa(unescape(encodeURIComponent(str))); }

  // attachments = [{ nombre, b64 }].
  async function enviar(o, token) {
    const boundary = 'sdirt_' + Math.random().toString(36).slice(2);
    let mime = 'To: ' + o.to + '\r\n' + (o.cc ? 'Cc: ' + o.cc + '\r\n' : '') +
      'Subject: ' + encabezado(o.asunto) + '\r\nMIME-Version: 1.0\r\n';
    const html = 'Content-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64Lineas(utf8B64(o.html)) + '\r\n';
    if (!o.adjuntos || !o.adjuntos.length) {
      mime += html;
    } else {
      mime += 'Content-Type: multipart/mixed; boundary="' + boundary + '"\r\n\r\n--' + boundary + '\r\n' + html;
      for (const a of o.adjuntos) {
        const nombre = a.nombre.replace(/["\\\r\n]/g, '');
        const ascii = !/[^\x20-\x7E]/.test(nombre);
        const name47 = ascii ? '"' + nombre + '"' : '=?UTF-8?B?' + utf8B64(nombre) + '?=';
        const disp = ascii ? 'filename="' + nombre + '"' : "filename*=UTF-8''" + encodeURIComponent(nombre);
        mime += '--' + boundary + '\r\nContent-Type: application/pdf; name=' + name47 + '\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; ' + disp + '\r\n\r\n' + b64Lineas(a.b64) + '\r\n';
      }
      mime += '--' + boundary + '--';
    }
    // 🔴 11 nov 2026: el endpoint de SUBIDA (upload/...?uploadType=media) no
    // responde CORS a un navegador → «Failed to fetch» en el primer envío real.
    // El de siempre (JSON con raw, como Viajero) aceptó un mensaje de 9 MB en
    // base64 en la prueba del mismo día: alcanza para los 9 PDF de una emisión.
    const raw = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw })
    });
    if (!res.ok) throw new Error('Gmail ' + res.status + ': ' + (await res.text()).slice(0, 300));
    return res.json();
  }

  async function fileToB64(file) { return abToB64(await file.arrayBuffer()); }

  return { htmlCotizacion, htmlEmision, enviar, fileToB64 };
})();
