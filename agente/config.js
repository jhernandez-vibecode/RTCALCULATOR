// agente/config.js — consola del agente de RT Construcción (11 nov 2026).
// Sin secretos: el Client ID OAuth es público por diseño. Es el MISMO Client ID
// de los cotizadores (Autos / Vital 360 / INS Medical) y de la consola de
// Asistencia Viajero, de donde se transcribieron auth.js y zip.js.
// Pre-requisito producción: en Google Cloud Console agregar el origen
// https://rtconstruccion.appsegurosdigitales.com a "Authorized JavaScript origins".
window.VCfg = {
  GOOGLE_CLIENT_ID: '255791314248-apgnrs0tiii72ogau5dpsjm2eie6d2hu.apps.googleusercontent.com',
  GMAIL_SCOPE: 'https://www.googleapis.com/auth/gmail.send openid email profile',
  WHITELIST: [
    'jhernandez@segurosdelins.com',
    'tramites@segurosdelins.com',
    'chernandez@seguros-ins.com',
    'fhernandez@segurosdelins.com'
  ],

  // Fórmula del cotizador público (Code.gs): monto asegurado = 35 % del valor de
  // la obra; prima = monto asegurado × tarifa. La tarifa depende de la actividad:
  // 3,98 % es la de construcción que usa el cotizador público y la que salió en
  // las pólizas emitidas de 2026. En la consola se puede cambiar por cotización.
  PCT_ASEGURADO: 0.35,
  TARIFA_DEFAULT: 3.98,
  VALIDEZ_DIAS: 15,

  // Enlaces del correo de cotización: los mismos que usa Code.gs (cotizador público).
  SOLICITUD_URL: 'https://drive.google.com/file/d/1BrPfWiw6w03OFKN3KdEu-FYIiuxWKL0e/view?usp=drive_link',
  CUENTAS_URL: 'https://drive.google.com/file/d/1_B3NLiFkhHeqb8auhjtNpHLgxwFO68cI/view?usp=drive_link',

  // Logos del correo. 🔴 URL ABSOLUTA y hosteados en este mismo sitio: en un correo
  // no sirve ni la ruta relativa, ni el SVG, ni el base64 (Gmail los bloquea).
  // El correo es cara al cliente: INS arriba (en tinta, el blanco no se ve sobre
  // blanco) y SDI al pie, a color, sobre la banda pálida.
  LOGO_INS_URL: 'https://rtconstruccion.appsegurosdigitales.com/img/ins-logo-tinta.png',
  LOGO_SDI_URL: 'https://rtconstruccion.appsegurosdigitales.com/img/sdi-logo-principal-ins.png',

  // Teléfonos del INS que trae el propio documento de Condiciones Especiales.
  INS_TEL: '800-835-3467',
  INS_KAL: '2287-6100',

  // Documentos generales: los mismos para toda póliza RT Construcción. Van en
  // agente/docs/ y se adjuntan solos. Si el agente arrastra una versión propia
  // (viene en la carpeta de la emisión), se usa la que arrastró y no se duplica.
  // Versión vigente: registro SUGESE del 20 de agosto de 2025 (lo dicen las
  // Condiciones Especiales); los archivos se tomaron de la emisión de sep 2026.
  DOCS_FIJOS: [
    { tipo: 'generales', nombre: 'Condiciones Generales 2025.pdf', path: 'docs/condiciones-generales-2025.pdf' },
    { tipo: 'norma', nombre: 'Norma Tecnica 2025.pdf', path: 'docs/norma-tecnica-2025.pdf' },
    { tipo: 'manual', nombre: 'Manual de acceso al sistema RT Virtual.pdf', path: 'docs/manual-rt-virtual.pdf' }
  ],

  // Perfil por cuenta de Google (multi-agente: nada amarrado a JC). Si la cuenta
  // que entra no está acá, se usa DEFAULT con su propio correo.
  AGENTES: {
    'jhernandez@segurosdelins.com': {
      nombre: 'Juan Carlos Hernández Vargas',
      rol: 'Agente de Seguros Exclusivo · Instituto Nacional de Seguros',
      licencia: '08-1318',
      codigo: '1101130',
      tel: '8822 1348',
      whatsapp: '50688221348',
      correo: 'jhernandez@segurosdelins.com',
      web: 'segurosdelins.com'
    }
  },
  DEFAULT: 'jhernandez@segurosdelins.com'
};
