// ─── Constantes del agente ────────────────────────────────────────────────────
const AGENTE = {
  nombre:   'Juan Carlos Hernández Vargas',
  licencia: '08-1318',           // verificar si es 08-1318 o 08-1310
  correo:   'jhernandez@segurosdelins.com',
  telefono: '8822-1348',
  waLink:   'https://wa.link/tbqrrn',
  wa:       '50688221348',
  web:      'www.segurosdelins.com'
};

// ID del Google Sheet donde se guardan las cotizaciones
// REEMPLAZAR con el ID real después de crear la hoja
const SHEET_ID = 'PENDIENTE_REEMPLAZAR';
const SHEET_NAME = 'Cotizaciones RT';

// Fórmula RT Construcción
const TASA_MONTO_ASEGURADO = 0.35;   // 35% del valor de la obra
const TASA_PRIMA           = 0.0398; // 3.98% del monto asegurado

// ─── Logging en Sheets ────────────────────────────────────────────────────────
function _registrarCotizacion(datos) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const hoja  = ss.getSheetByName(SHEET_NAME);
  hoja.appendRow([
    new Date(),
    datos.nombre,
    datos.telefono,
    datos.correo,
    datos.montoObra,
    datos.montoAsegurado,
    datos.prima,
    'Enviada'
  ]);
}

// ─── Validación ───────────────────────────────────────────────────────────────
function _validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _checkRateLimit(email) {
  const cache = CacheService.getScriptCache();
  const key   = 'rl_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (cache.get(key)) return false; // bloqueado
  cache.put(key, '1', 30);          // 30 segundos de bloqueo
  return true;
}

// ─── Cálculo prima ────────────────────────────────────────────────────────────
function _calcular(montoObra) {
  const montoAsegurado = montoObra * TASA_MONTO_ASEGURADO;
  const prima          = montoAsegurado * TASA_PRIMA;
  return { montoAsegurado, prima };
}

// ─── Formateo de moneda ───────────────────────────────────────────────────────
function _formatCRC(numero) {
  return '₡ ' + Math.round(numero).toLocaleString('es-CR');
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────
function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Respuesta JSON ───────────────────────────────────────────────────────────
function _jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Endpoint principal ───────────────────────────────────────────────────────
function doPost(e) {
  try {
    const p = e.parameter;

    // Honeypot: si el campo website tiene valor, es un bot
    if (p.website) return _jsonResp({ status: 'ok' });

    // Validar campos requeridos
    const nombre   = (p.nombre   || '').trim();
    const telefono = (p.telefono || '').trim();
    const correo   = (p.correo   || '').trim().toLowerCase();
    const montoRaw = (p.montoObra || '').replace(/[^0-9.]/g, '');

    if (!nombre || !telefono || !correo || !montoRaw) {
      return _jsonResp({ status: 'error', msg: 'Campos incompletos' });
    }
    if (!_validarEmail(correo)) {
      return _jsonResp({ status: 'error', msg: 'Correo inválido' });
    }
    if (!_checkRateLimit(correo)) {
      return _jsonResp({ status: 'ok' }); // silencioso para no revelar el bloqueo
    }

    const montoObra = parseFloat(montoRaw);
    if (isNaN(montoObra) || montoObra <= 0) {
      return _jsonResp({ status: 'error', msg: 'Monto inválido' });
    }

    const { montoAsegurado, prima } = _calcular(montoObra);
    const datos = { nombre, telefono, correo, montoObra, montoAsegurado, prima };

    // Guardar en Sheets
    _registrarCotizacion(datos);

    // Enviar correos
    _enviarEmailCliente(datos);
    _enviarNotificacionAgente(datos);

    return _jsonResp({ status: 'ok' });

  } catch (err) {
    console.error('doPost error:', err);
    return _jsonResp({ status: 'error', msg: 'Error interno' });
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'online', app: 'Cotizador RT Construcción' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Email al cliente ─────────────────────────────────────────────────────────
function _enviarEmailCliente(d) {
  const nombre         = _escapeHtml(d.nombre);
  const primerNombre   = nombre.split(' ')[0];
  const montoObraFmt   = _formatCRC(d.montoObra);
  const primaFmt       = _formatCRC(d.prima);
  const refCode        = 'RT-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- HEADER -->
  <tr><td style="background:#0B1F3D;padding:28px 32px;border-radius:10px 10px 0 0;text-align:center">
    <p style="margin:0 0 4px 0;color:#FFD100;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Instituto Nacional de Seguros</p>
    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">Cotización Seguro RT Construcción</h1>
    <p style="margin:8px 0 0 0;color:rgba(255,255,255,.6);font-size:12px">Ref: ${refCode}</p>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="background:#ffffff;padding:28px 32px 0 32px">
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151">Hola <strong style="color:#003DA5">${primerNombre}</strong>,</p>
    <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6">
      Recibimos tu solicitud de cotización para el Seguro de Riesgos del Trabajo Construcción. Aquí tenés el detalle:
    </p>
  </td></tr>

  <!-- COTIZACIÓN -->
  <tr><td style="background:#ffffff;padding:20px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #E5E7EB;border-radius:10px;overflow:hidden">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #E5E7EB">
          <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px">Valor de la obra</p>
          <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:#0B1F3D">${montoObraFmt}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background:#00A859">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.5px">Prima anual</p>
          <p style="margin:4px 0 0 0;font-size:26px;font-weight:800;color:#ffffff">${primaFmt}</p>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center">
      ⏱ Cotización válida por 15 días · Valores pueden variar según condiciones municipales
    </p>
  </td></tr>

  <!-- RESUMEN SOLICITUD -->
  <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB">
    <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px">Resumen de tu solicitud</p>
    <table width="100%" cellpadding="4" cellspacing="0">
      <tr>
        <td style="font-size:13px;color:#9CA3AF;width:40%">Nombre</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:600">${nombre}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#9CA3AF">Correo</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:600">${_escapeHtml(d.correo)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#9CA3AF">Teléfono</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:600">${_escapeHtml(d.telefono)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- REQUISITOS -->
  <tr><td style="background:#ffffff;padding:24px 32px">
    <p style="margin:0 0 16px 0;font-size:14px;font-weight:700;color:#0B1F3D">Pasos para emitir el seguro</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 0 14px 0;vertical-align:top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#003DA5;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#fff">1</td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:middle;line-height:1.5">
            <strong>Complete y firme la solicitud adjunta</strong><br>
            <span style="color:#6B7280">Podés hacerlo de forma digital o manual</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 14px 0;vertical-align:top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#003DA5;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#fff">2</td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:middle;line-height:1.5">
            <strong>Envíenos la boleta de la Municipalidad o del CFIA</strong><br>
            <span style="color:#6B7280">Datos de la obra y solicitud del seguro</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 14px 0;vertical-align:top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#6B7280;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#fff">3</td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:middle;line-height:1.5">
            <strong>Si es sociedad:</strong> copia de la personería jurídica
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 4px 0;vertical-align:top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#003DA5;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#fff">4</td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:middle;line-height:1.5">
            <strong>Formas de pago</strong><br>
            <span style="color:#6B7280">Depósito en las cuentas del INS · Link de pago con tarjeta</span>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA WHATSAPP -->
  <tr><td style="background:#ffffff;padding:0 32px 24px 32px;text-align:center">
    <a href="${AGENTE.waLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px">
      📱 Contactar al agente por WhatsApp
    </a>
  </td></tr>

  <!-- FOOTER AGENTE -->
  <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:3px solid #00A859;text-align:center">
    <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#0B1F3D">${AGENTE.nombre}</p>
    <p style="margin:0 0 4px 0;font-size:12px;color:#6B7280">Agente de Seguros Exclusivo INS | Licencia SUGESE ${AGENTE.licencia}</p>
    <p style="margin:0 0 12px 0;font-size:12px;color:#6B7280">
      📱 <a href="${AGENTE.waLink}" style="color:#25D366;text-decoration:none;font-weight:700">${AGENTE.telefono} (WhatsApp)</a>
      &nbsp;|&nbsp;
      ✉️ <a href="mailto:${AGENTE.correo}" style="color:#003DA5;text-decoration:none">${AGENTE.correo}</a>
    </p>
    <p style="margin:0;font-size:11px;color:#9CA3AF">🌐 ${AGENTE.web}</p>
  </td></tr>

  <!-- FOOTER SDI -->
  <tr><td style="background:#0B1F3D;padding:20px 32px;border-radius:0 0 10px 10px;text-align:center">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px">
      <tr>
        <td style="vertical-align:middle;padding-right:10px">
          <div style="background:#fff;height:3px;width:30px;margin-bottom:3px;border-radius:2px"></div>
          <div style="background:#fff;height:3px;width:22px;margin-bottom:3px;border-radius:2px"></div>
          <div style="background:#fff;height:3px;width:30px;margin-bottom:3px;border-radius:2px"></div>
          <div style="background:#fff;height:3px;width:16px;border-radius:2px"></div>
        </td>
        <td style="vertical-align:middle">
          <p style="margin:0;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:1px">SDI</p>
          <p style="margin:0;color:rgba(255,255,255,.5);font-size:8px;letter-spacing:2px">SEGUROS DIGITALES</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:rgba(255,255,255,.4);font-size:10px;line-height:1.7">
      © Propiedad intelectual de Juan Carlos Hernández Vargas<br>
      Seguros Digitales SDI — Todos los derechos reservados
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  MailApp.sendEmail({
    to:       d.correo,
    subject:  '🏗️ Cotización Seguro RT Construcción — ' + d.nombre,
    htmlBody: html
  });
}
