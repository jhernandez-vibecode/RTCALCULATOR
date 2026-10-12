# SKILL — Cotizador RT Construcción
**Última actualización:** 8 mayo 2026 (checkpoint de arquitectura)  
**Estado:** EN PRODUCCIÓN COMPLETA — https://rtconstruccion.appsegurosdigitales.com

**12 oct 2026:** marca «SDI Seguros Digitales INS» — el pie de `index.html` y `cotizador-construccion.html` cambia el logo armado a mano (spans + barras CSS + «SEGUROS DIGITALES») por el SVG del kit v1.4 (04 negativo, en línea, 68 px de alto); el correo al cliente (`Code.gs`, lo implementa JC) sigue con SDI + barras en tabla pero dice «SEGUROS DIGITALES INS» y «SDI Seguros Digitales INS — Todos los derechos reservados».

---

## Qué es este proyecto

Cotizador de Seguro de Riesgos del Trabajo Construcción (RT) del INS Costa Rica. Página **standalone en Netlify con subdominio SDI propio** que captura 4 datos del cliente y envía automáticamente la cotización al correo, sin mostrar el precio en la página (estrategia lead gen enfocada).

Nació pensado para embeberse en Google Sites, pero **se migró a standalone** por limitaciones técnicas de Sites (ver "Integración con Google Sites"). Hoy en `segurosdelins.com/seguro-riesgos-construccion` hay un **botón que abre el cotizador en pestaña nueva** — no hay iframe.

---

## Arquitectura

```
Netlify — rtconstruccion.appsegurosdigitales.com (HTTPS forzado)
    └── index.html (página standalone)
            │  POST
            ▼
    doPost() — Code.gs (Apps Script Web App)
            ├── Valida + honeypot + rate limit 30s
            ├── Calcula prima
            ├── Guarda en Google Sheets
            └── Envía 2 correos
                    ├── Cliente → cotización + requisitos + links
                    └── Agente → tabla datos + botón WhatsApp

Google Sites → botón con link a Netlify (target=_blank). NO iframe.
```

`doGet()` en Code.gs todavía sirve el formulario (queda como respaldo del Apps Script), pero la versión que ve el cliente es la de Netlify.

---

## URLs y recursos

| Recurso | Valor |
|---------|-------|
| **URL producción** | **https://rtconstruccion.appsegurosdigitales.com** (Netlify, HTTPS forzado) |
| Página en Sites | `segurosdelins.com/seguro-riesgos-construccion` → botón que abre la URL de arriba en pestaña nueva |
| Apps Script URL | `https://script.google.com/macros/s/AKfycbwapSr3aJSnGVS-nC6LlwfXlWp1U5LS63QP4iKjr6ZKgQeS2BxgvQ3HWZiPpSabNhF7TQ/exec` |
| Google Sheet ID | `1wYvzscJLrYjI2Az95xKdKwgNtfNe8rd4qfIJ-0UKGyA` |
| Sheet tab | Primera hoja (fallback — `getSheets()[0]`) |
| Repo local | `C:\Users\segur\RT-construccion-appscript` |
| **Repo GitHub** | **https://github.com/jhernandez-vibecode/RTCALCULATOR** (renombrado desde `RT-construccion-appscript`; la carpeta local conserva el nombre viejo) |

---

## Fórmula de cálculo

```
Monto asegurado = Valor obra × 35%
Prima (monto a cancelar) = Monto asegurado × 3.98%

Ejemplo: ₡50,000,000 → ₡17,500,000 → ₡696,500
```

---

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | **Entry point de Netlify** — es lo que ve el cliente. Idéntico a `cotizador-construccion.html` (duplicado a propósito: Netlify exige `index.html`) |
| `cotizador-construccion.html` | Misma página, nombre descriptivo. Si se edita una, hay que copiarla a la otra |
| `Code.gs` | Backend completo: doGet (sirve HTML de respaldo), doPost, emails, Sheets |
| `appsscript.json` | Manifest V8, ANYONE_ANONYMOUS, Costa Rica |
| `logo-ins-blanco.png` | Logo INS blanco del header del formulario |

---

## Campos del formulario

- Nombre completo
- Teléfono
- Correo electrónico
- Valor de la obra (con máscara ₡ + separadores de miles)
- website (honeypot oculto)

---

## Decisiones clave de la página (no revertir sin razón)

- **Sin precio en pantalla.** El monto solo va al correo — es lead gen enfocado, no cotizador abierto.
- **Efecto de éxito = checkmark SVG, NO confeti.** Es un seguro empresarial obligatorio, no un motivo de alegría.
- **Consentimiento Ley 8968** + modal de aviso legal completo.
- **Botón "Volver al sitio"** verde gradiente prominente arriba, y un segundo botón igual al final de la página (ancho completo, centrado).
- Header del formulario con logo INS blanco.

---

## Correo al cliente

1. Header INS azul oscuro (#0B1F3D) + título + ref RT-YYYY-XXXXXX
2. Valor de la obra + **Monto a cancelar** (verde)
3. Nota: válido 15 días, vigencia máx 11 meses y medio
4. Resumen solicitud: nombre, correo, teléfono
5. 4 pasos para emitir:
   - Paso 1: solicitud firmada + link Drive: `1BrPfWiw6w03OFKN3KdEu-FYIiuxWKL0e`
   - Paso 2: boleta Municipalidad o CFIA
   - Paso 3: si es sociedad → personería jurídica
   - Paso 4: formas de pago + link cuentas INS: `1_B3NLiFkhHeqb8auhjtNpHLgxwFO68cI`
6. Botón WhatsApp agente
7. Footer agente (Juan Carlos, licencia 08-1318, 8822-1348)
8. Footer SDI (SDI grande + 4 barras iguales + copyright)

---

## Notificación al agente (jhernandez@segurosdelins.com)

- Tabla: nombre, teléfono, correo, valor obra, prima calculada
- Botón WhatsApp → cliente (506 + teléfono, mensaje pre-cargado)

---

## Constantes del agente

```javascript
const AGENTE = {
  nombre:   'Juan Carlos Hernández Vargas',
  licencia: '08-1318',
  correo:   'jhernandez@segurosdelins.com',
  telefono: '8822-1348',
  waLink:   'https://wa.link/tbqrrn',
  wa:       '50688221348',
  web:      'www.segurosdelins.com'
};
```

---

## Integración con Google Sites — botón, NUNCA iframe

En `segurosdelins.com/seguro-riesgos-construccion` hay un **botón que abre `https://rtconstruccion.appsegurosdigitales.com` en pestaña nueva**.

No intentar volver al iframe: Google Sites no soporta auto-resize (altura fija, no escucha `postMessage`), así que el formulario quedaba cortado o con scroll interno. Esa fue exactamente la razón de migrar a Netlify.

---

## Cómo redesplegar

**Frontend (`index.html` / `cotizador-construccion.html`):**
1. Editar local en `C:\Users\segur\RT-construccion-appscript`
2. Mantener los dos archivos idénticos
3. `git push` a `main` → Netlify auto-deploy (si el sitio está vinculado al repo; si no, drag & drop manual en Netlify)

**Backend (`Code.gs`):**
1. Pegar contenido completo en Apps Script (script.google.com)
2. Guardar `Ctrl+S`
3. Implementar → Gestionar implementaciones → lápiz → Nueva versión → Implementar

---

## Gotchas y fixes post-deploy (con el porqué)

| Fix | Descripción | Lección reutilizable |
|-----|-------------|----------------------|
| Sheet fallback | `getSheetByName() \|\| getSheets()[0]` — el nombre del tab no coincidía | Apps Script `getSheetByName()` es **case-sensitive**; sin fallback tira `Cannot read 'appendRow' of null` |
| Steppers | Tablas anidadas para círculos uniformes en Gmail | `border-radius:50%` en un `<td>` se deforma con texto multilínea → anidar el círculo en una tabla interna con dimensiones fijas |
| Logo SDI | SDI grande izquierda + 4 barras iguales derecha (brand kit `04-sdi-logo-negativo.svg`) | **Gmail bloquea SVG en correos** → recrear logos con HTML + tablas |
| Máscara monto | ₡ + separadores de miles con `input type=text` | — |
| Monto a cancelar | Renombrado desde "Prima anual" (seguro de corto plazo) | — |
| `index.html` duplicado | Netlify Drop exige `index.html` como entry point | Si el archivo se llama distinto, duplicarlo |
| Migración a Netlify | Se abandonó el embed en Sites | Google Sites **no** soporta auto-resize de iframes, y la URL de un Apps Script web app tampoco se puede embeber "Mediante URL" (solo "Incorporar código", que igual no arregla la altura) |
