# SKILL — Cotizador RT Construcción
**Última actualización:** 8 mayo 2026  
**Estado:** EN PRODUCCIÓN — pendiente solo embed Google Sites

---

## Qué es este proyecto

Cotizador de Seguro de Riesgos del Trabajo Construcción (RT) del INS Costa Rica. Formulario embebible en Google Sites que captura 4 datos del cliente y envía automáticamente la cotización al correo, sin mostrar el precio en la página (estrategia de venta enfocada).

---

## Arquitectura

```
Google Sites (iframe embed)
    └── doGet() sirve el formulario HTML
            │  POST
            ▼
    doPost() — Code.gs (Apps Script)
            ├── Valida + honeypot + rate limit 30s
            ├── Calcula prima
            ├── Guarda en Google Sheets
            └── Envía 2 correos
                    ├── Cliente → cotización + requisitos + links
                    └── Agente → tabla datos + botón WhatsApp
```

---

## URLs y recursos

| Recurso | Valor |
|---------|-------|
| Apps Script URL | `https://script.google.com/macros/s/AKfycbwapSr3aJSnGVS-nC6LlwfXlWp1U5LS63QP4iKjr6ZKgQeS2BxgvQ3HWZiPpSabNhF7TQ/exec` |
| Google Sheet ID | `1wYvzscJLrYjI2Az95xKdKwgNtfNe8rd4qfIJ-0UKGyA` |
| Sheet tab | Primera hoja (fallback — `getSheets()[0]`) |
| Repo local | `C:\Users\segur\RT-construccion-appscript` |
| Repo GitHub | https://github.com/jhernandez-vibecode/RT-construccion-appscript |

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
| `Code.gs` | Backend completo: doGet (sirve HTML), doPost, emails, Sheets |
| `cotizador-construccion.html` | Formulario standalone (misma versión que doGet) |
| `appsscript.json` | Manifest V8, ANYONE_ANONYMOUS, Costa Rica |

---

## Campos del formulario

- Nombre completo
- Teléfono
- Correo electrónico
- Valor de la obra (con máscara ₡ + separadores de miles)
- website (honeypot oculto)

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

## Embed Google Sites (PENDIENTE)

Google Sites no acepta URL de Apps Script en "Mediante URL". Usar **"Incorporar código"** con este iframe:

```html
<iframe src="https://script.google.com/macros/s/AKfycbwapSr3aJSnGVS-nC6LlwfXlWp1U5LS63QP4iKjr6ZKgQeS2BxgvQ3HWZiPpSabNhF7TQ/exec" width="100%" height="560" frameborder="0" style="border:none;border-radius:14px"></iframe>
```

---

## Cómo redesplegar

Cuando se modifica `Code.gs`:
1. Pegar contenido completo en Apps Script (script.google.com)
2. Guardar `Ctrl+S`
3. Implementar → Gestionar implementaciones → lápiz → Nueva versión → Implementar

---

## Historial de fixes post-deploy

| Fix | Descripción |
|-----|-------------|
| Sheet fallback | `getSheetByName() \|\| getSheets()[0]` — nombre tab no coincidía |
| Steppers | Tablas anidadas para círculos uniformes en Gmail |
| Logo SDI | SDI grande izquierda + 4 barras iguales derecha (brand kit) |
| Máscara monto | ₡ + separadores de miles con input type=text |
| Monto a cancelar | Renombrado desde "Prima anual" (seguro corto plazo) |
| doGet HTML | Ahora sirve el formulario directamente para embed |
