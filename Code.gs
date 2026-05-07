// ─── Constantes del agente ────────────────────────────────────────────────────
const AGENTE = {
  nombre:   'Juan Carlos Hernández Vargas',
  licencia: '08-1318',
  correo:   'jhernandez@segurosdelins.com',
  telefono: '8822-1348',
  waLink:   'https://wa.link/tbqrrn',
  wa:       '50688221348',
  web:      'www.segurosdelins.com'
};

// ID del Google Sheet donde se guardan las cotizaciones
// REEMPLAZAR con el ID real después de crear la hoja
const SHEET_ID = '1wYvzscJLrYjI2Az95xKdKwgNtfNe8rd4qfIJ-0UKGyA';
const SHEET_NAME = 'Cotizaciones RT';

// Fórmula RT Construcción
const TASA_MONTO_ASEGURADO = 0.35;   // 35% del valor de la obra
const TASA_PRIMA           = 0.0398; // 3.98% del monto asegurado

// ─── Logging en Sheets ────────────────────────────────────────────────────────
function _registrarCotizacion(datos) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const hoja  = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
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
    return _jsonResp({ status: 'error', msg: 'Error interno. Intentá de nuevo.' });
  }
}

function doGet() {
  return HtmlService
    .createHtmlOutput(htmlFormulario())
    .setTitle('Cotización Seguro RT Construcción | INS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function htmlFormulario() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cotización Seguro RT Construcción | INS</title>
<style>
  :root{--ins-dark:#0B1F3D;--ins-blue:#003DA5;--ins-blue-l:#1E6EE8;--ins-green:#00A859;--ins-yellow:#FFD100;--gray-50:#F9FAFB;--gray-100:#F3F4F6;--gray-200:#E5E7EB;--gray-400:#9CA3AF;--gray-500:#6B7280;--gray-700:#374151;--gray-900:#111827}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#f6f9fc 0%,#eef4fb 100%);color:var(--gray-900);-webkit-font-smoothing:antialiased;padding:12px;min-height:100vh;display:flex;align-items:flex-start;justify-content:center}
  .card{background:#fff;border-radius:14px;overflow:hidden;width:100%;max-width:480px;box-shadow:0 16px 40px -12px rgba(11,31,61,.18),0 4px 12px -4px rgba(11,31,61,.08)}
  .header{background:linear-gradient(135deg,var(--ins-blue) 0%,var(--ins-blue-l) 100%);padding:20px 24px;text-align:center}
  .header-badge{display:inline-block;background:var(--ins-yellow);color:var(--ins-dark);font-size:10px;font-weight:800;padding:3px 10px;border-radius:999px;letter-spacing:.5px;margin-bottom:8px}
  .header h1{color:#fff;font-size:18px;font-weight:800;line-height:1.3}
  .header p{color:rgba(255,255,255,.75);font-size:12px;margin-top:4px}
  .form-body{padding:24px;display:flex;flex-direction:column;gap:14px}
  .field{display:flex;flex-direction:column;gap:5px}
  .field label{font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px}
  .field input{height:44px;border:1.5px solid var(--gray-200);border-radius:8px;padding:0 14px;font-size:14px;color:var(--gray-900);background:var(--gray-50);transition:border-color .2s,box-shadow .2s;width:100%}
  .field input:focus{outline:none;border-color:var(--ins-blue);box-shadow:0 0 0 3px rgba(0,61,165,.1);background:#fff}
  .field input.error{border-color:#EF4444}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .field-monto label{color:var(--ins-blue)}
  .field-monto input{border-color:rgba(0,61,165,.3);background:#EFF6FF;font-size:16px;font-weight:600}
  .field-monto input:focus{background:#fff}
  .field-hint{font-size:11px;color:var(--gray-400);margin-top:-2px}
  .divider{display:flex;align-items:center;gap:10px;color:var(--gray-400);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--gray-200)}
  .hp{display:none!important}
  .btn-submit{width:100%;height:48px;background:var(--ins-blue);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;position:relative;overflow:hidden;transition:background .3s,transform .1s}
  .btn-submit:hover:not(:disabled){background:var(--ins-blue-l)}
  .btn-submit:active:not(:disabled){transform:scale(.98)}
  .btn-submit:disabled{cursor:default}
  .btn-submit .label{transition:opacity .2s}
  .btn-submit .spinner{display:none}
  .btn-submit.loading .label{opacity:0}
  .btn-submit.loading .spinner{display:flex;align-items:center;justify-content:center;position:absolute;inset:0}
  .spin-ring{width:22px;height:22px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .btn-submit.success{background:var(--ins-green)}
  .btn-submit.success .label{opacity:0}
  .btn-submit .check-wrap{display:none;position:absolute;inset:0;align-items:center;justify-content:center}
  .btn-submit.success .check-wrap{display:flex}
  .check-wrap svg circle{stroke:rgba(255,255,255,.35);stroke-width:2;fill:none;stroke-dasharray:56;stroke-dashoffset:56;animation:circle-draw .4s ease forwards}
  .check-wrap svg polyline{stroke:#fff;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:22;stroke-dashoffset:22;animation:check-draw .35s ease .35s forwards}
  @keyframes circle-draw{to{stroke-dashoffset:0}}
  @keyframes check-draw{to{stroke-dashoffset:0}}
  .success-msg{display:none;text-align:center;font-size:13px;color:var(--ins-green);font-weight:600;margin-top:8px;animation:fade-up .4s ease .6s both}
  .success-msg.show{display:block}
  @keyframes fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .error-msg{display:none;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 14px;font-size:12px;color:#B91C1C;text-align:center}
  .error-msg.show{display:block}
  .form-footer{padding:12px 24px 16px;text-align:center;font-size:11px;color:var(--gray-400);border-top:1px solid var(--gray-100)}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="header-badge">🏗️ RT CONSTRUCCIÓN · INS</div>
    <h1>Cotización Seguro<br>Riesgos del Trabajo</h1>
    <p>Completá el formulario · tu cotización llega al correo</p>
  </div>
  <form id="cotizadorForm" class="form-body" novalidate>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off">
    <div class="field-row">
      <div class="field">
        <label for="nombre">Nombre completo</label>
        <input type="text" id="nombre" name="nombre" placeholder="Ej. María Pérez" required autocomplete="name">
      </div>
      <div class="field">
        <label for="telefono">Teléfono</label>
        <input type="tel" id="telefono" name="telefono" placeholder="8800-0000" required autocomplete="tel">
      </div>
    </div>
    <div class="field">
      <label for="correo">Correo electrónico</label>
      <input type="email" id="correo" name="correo" placeholder="correo@ejemplo.com" required autocomplete="email">
    </div>
    <div class="divider">Datos de la obra</div>
    <div class="field field-monto">
      <label for="montoObra">Valor de la obra</label>
      <input type="text" id="montoObra" name="montoObra" placeholder="₡ 0" inputmode="numeric" autocomplete="off" required>
      <input type="hidden" id="montoObraRaw">
      <span class="field-hint">Ingresá el costo total de la construcción en colones</span>
    </div>
    <div>
      <button type="submit" class="btn-submit" id="btnSubmit">
        <span class="label">Solicitar cotización al correo →</span>
        <span class="spinner"><div class="spin-ring"></div></span>
        <span class="check-wrap">
          <svg width="26" height="26" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/>
            <polyline points="7,12 10.5,15.5 17,9"/>
          </svg>
        </span>
      </button>
    </div>
    <div class="success-msg" id="successMsg">✅ Cotización enviada · revisá tu correo en instantes</div>
    <div class="error-msg" id="errorMsg">Ocurrió un error al enviar. Por favor intentá de nuevo.</div>
  </form>
  <div class="form-footer">🔒 Tu información es confidencial · Cotización válida 15 días</div>
</div>
<script>
const WEBAPP_URL='https://script.google.com/macros/s/AKfycbwapSr3aJSnGVS-nC6LlwfXlWp1U5LS63QP4iKjr6ZKgQeS2BxgvQ3HWZiPpSabNhF7TQ/exec';
const form=document.getElementById('cotizadorForm');
const btn=document.getElementById('btnSubmit');
const success=document.getElementById('successMsg');
const errMsg=document.getElementById('errorMsg');
form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  if(!validarForm())return;
  btn.disabled=true;btn.classList.add('loading');errMsg.classList.remove('show');
  const body=new URLSearchParams({nombre:document.getElementById('nombre').value.trim(),telefono:document.getElementById('telefono').value.trim(),correo:document.getElementById('correo').value.trim(),montoObra:document.getElementById('montoObraRaw').value,website:form.querySelector('[name="website"]').value});
  try{
    const res=await fetch(WEBAPP_URL,{method:'POST',body});
    const data=await res.json();
    btn.classList.remove('loading');
    if(data.status==='ok'){btn.classList.add('success');success.classList.add('show');form.querySelectorAll('input').forEach(i=>i.disabled=true);}
    else{btn.disabled=false;errMsg.textContent=data.msg||'Error al enviar. Intentá de nuevo.';errMsg.classList.add('show');}
  }catch(err){btn.classList.remove('loading');btn.disabled=false;errMsg.classList.add('show');}
});
function validarForm(){
  let ok=true;
  ['nombre','telefono','correo'].forEach(id=>{const el=document.getElementById(id);const val=el.value.trim();if(!val||(id==='correo'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))){el.classList.add('error');ok=false;}else{el.classList.remove('error');}});
  const montoEl=document.getElementById('montoObra');const montoRaw=document.getElementById('montoObraRaw').value;
  if(!montoRaw||parseFloat(montoRaw)<=0){montoEl.classList.add('error');ok=false;}else{montoEl.classList.remove('error');}
  return ok;
}
const montoInput=document.getElementById('montoObra');const montoRawEl=document.getElementById('montoObraRaw');
montoInput.addEventListener('input',()=>{const digits=montoInput.value.replace(/[^0-9]/g,'');montoRawEl.value=digits;montoInput.value=digits?'₡ '+parseInt(digits,10).toLocaleString('es-CR'):'';montoInput.classList.remove('error');});
montoInput.addEventListener('keydown',(e)=>{if(e.key==='Backspace'||e.key==='Delete'){const digits=montoRawEl.value.slice(0,-1);montoRawEl.value=digits;montoInput.value=digits?'₡ '+parseInt(digits,10).toLocaleString('es-CR'):'';e.preventDefault();}});
document.querySelectorAll('input:not(#montoObra)').forEach(el=>{el.addEventListener('input',()=>el.classList.remove('error'));});
</script>
</body>
</html>`;
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
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.5px">Monto a cancelar</p>
          <p style="margin:4px 0 0 0;font-size:26px;font-weight:800;color:#ffffff">${primaFmt}</p>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center">
      ⏱ Cotización válida por 15 días · Vigencia máxima 11 meses y medio · Valores pueden variar según condiciones municipales
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
      <tr><td style="padding:0 0 14px 0">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="28" style="width:28px;min-width:28px;vertical-align:top;padding-top:2px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="28" height="28" style="width:28px;height:28px;background:#003DA5;border-radius:14px;-webkit-border-radius:14px;text-align:center;font-size:12px;font-weight:700;color:#fff;line-height:28px">1</td>
            </tr></table>
          </td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:top;line-height:1.6">
            <strong>Complete y firme la solicitud adjunta</strong><br>
            <span style="color:#6B7280">Podés hacerlo de forma digital o manual · </span>
            <a href="https://drive.google.com/file/d/1BrPfWiw6w03OFKN3KdEu-FYIiuxWKL0e/view?usp=drive_link" style="color:#003DA5;font-weight:600">Descargar solicitud</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 14px 0">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="28" style="width:28px;min-width:28px;vertical-align:top;padding-top:2px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="28" height="28" style="width:28px;height:28px;background:#003DA5;border-radius:14px;-webkit-border-radius:14px;text-align:center;font-size:12px;font-weight:700;color:#fff;line-height:28px">2</td>
            </tr></table>
          </td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:top;line-height:1.6">
            <strong>Envíenos la boleta de la Municipalidad o del CFIA</strong><br>
            <span style="color:#6B7280">Datos de la obra y solicitud del seguro</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 14px 0">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="28" style="width:28px;min-width:28px;vertical-align:top;padding-top:2px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="28" height="28" style="width:28px;height:28px;background:#003DA5;border-radius:14px;-webkit-border-radius:14px;text-align:center;font-size:12px;font-weight:700;color:#fff;line-height:28px">3</td>
            </tr></table>
          </td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:top;line-height:1.6">
            <strong>Si es sociedad:</strong> copia de la personería jurídica
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 4px 0">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="28" style="width:28px;min-width:28px;vertical-align:top;padding-top:2px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="28" height="28" style="width:28px;height:28px;background:#003DA5;border-radius:14px;-webkit-border-radius:14px;text-align:center;font-size:12px;font-weight:700;color:#fff;line-height:28px">4</td>
            </tr></table>
          </td>
          <td style="padding-left:12px;font-size:13px;color:#374151;vertical-align:top;line-height:1.6">
            <strong>Formas de pago</strong><br>
            <a href="https://drive.google.com/file/d/1_B3NLiFkhHeqb8auhjtNpHLgxwFO68cI/view?usp=drive_link" style="color:#003DA5;font-weight:600">Ver cuentas del INS</a>
            <span style="color:#6B7280"> · Link de pago con tarjeta</span>
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
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px">
      <tr>
        <td style="vertical-align:middle;padding-right:10px">
          <p style="margin:0;color:#ffffff;font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1">SDI</p>
        </td>
        <td style="vertical-align:middle;padding-left:4px">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#ffffff;width:30px;height:6px;border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="background:#ffffff;width:30px;height:6px;border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="background:#ffffff;width:30px;height:6px;border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="background:#ffffff;width:30px;height:6px;border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;color:rgba(255,255,255,.6);font-size:10px;font-weight:500;letter-spacing:3px">SEGUROS DIGITALES</p>
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

// ─── Notificación al agente ───────────────────────────────────────────────────
function _enviarNotificacionAgente(d) {
  const waCliente = 'https://wa.me/506' + d.telefono.replace(/[^0-9]/g, '');
  const mensaje   = encodeURIComponent(
    'Hola ' + d.nombre + ', le escribo de parte de Juan Carlos Hernández (Seguros INS) ' +
    'con respecto a su cotización del Seguro RT Construcción. ¿Tiene alguna consulta?'
  );

  const html = `<div style="font-family:Arial,sans-serif;max-width:500px;padding:24px;border:2px solid #003DA5;border-radius:10px">
    <h2 style="margin:0 0 16px 0;color:#0B1F3D;font-size:18px">
      🏗️ Nueva cotización RT Construcción
    </h2>
    <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
      <tr style="background:#F0F7FF">
        <td style="font-size:13px;color:#6B7280;width:40%;padding:8px 12px;border-bottom:1px solid #E5E7EB">Nombre</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:700;padding:8px 12px;border-bottom:1px solid #E5E7EB">${_escapeHtml(d.nombre)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6B7280;padding:8px 12px;border-bottom:1px solid #E5E7EB">Teléfono</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:700;padding:8px 12px;border-bottom:1px solid #E5E7EB">${_escapeHtml(d.telefono)}</td>
      </tr>
      <tr style="background:#F0F7FF">
        <td style="font-size:13px;color:#6B7280;padding:8px 12px;border-bottom:1px solid #E5E7EB">Correo</td>
        <td style="font-size:13px;color:#003DA5;padding:8px 12px;border-bottom:1px solid #E5E7EB">
          <a href="mailto:${_escapeHtml(d.correo)}" style="color:#003DA5">${_escapeHtml(d.correo)}</a>
        </td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6B7280;padding:8px 12px;border-bottom:1px solid #E5E7EB">Valor de obra</td>
        <td style="font-size:13px;color:#0B1F3D;font-weight:700;padding:8px 12px;border-bottom:1px solid #E5E7EB">${_formatCRC(d.montoObra)}</td>
      </tr>
      <tr style="background:#F0FFF4">
        <td style="font-size:13px;color:#6B7280;padding:8px 12px">Prima calculada</td>
        <td style="font-size:15px;color:#00A859;font-weight:800;padding:8px 12px">${_formatCRC(d.prima)}</td>
      </tr>
    </table>
    <a href="${waCliente}?text=${mensaje}"
       style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">
      📱 WhatsApp → ${_escapeHtml(d.nombre)}
    </a>
  </div>`;

  MailApp.sendEmail({
    to:       AGENTE.correo,
    subject:  '🏗️ RT Construcción — ' + d.nombre + ' · Tel: ' + d.telefono,
    htmlBody: html
  });
}
