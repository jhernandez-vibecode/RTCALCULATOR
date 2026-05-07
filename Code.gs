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
