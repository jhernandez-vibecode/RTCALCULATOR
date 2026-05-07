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
