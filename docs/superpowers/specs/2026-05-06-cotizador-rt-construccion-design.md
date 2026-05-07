# Cotizador RT Construcción — Design Spec
**Fecha:** 2026-05-06  
**Proyecto:** RT-construccion-appscript  
**Repo:** https://github.com/jhernandez-vibecode/RT-construccion-appscript  
**Referencia:** Cotizador Viaje INS (https://github.com/jhernandez-vibecode/viajero-app-script)

---

## Resumen

Formulario embebido en Google Sites que captura 4 datos del cliente y envía automáticamente una cotización del Seguro de Riesgos del Trabajo Construcción (RT) al correo del cliente, junto con una notificación al agente. El precio no se muestra en la página — llega solo por correo para mantener al cliente en un flujo de venta dirigido.

---

## 1. Arquitectura

```
Google Sites (iframe embed)
    └── cotizador-construccion.html   ← formulario single-file
            │  POST
            ▼
    Google Apps Script (doPost)       ← Code.gs
            │
            ├── Valida campos + honeypot + rate limit
            ├── Calcula prima
            ├── Guarda en Google Sheets
            └── Envía 2 correos
                    ├── Cliente → cotización + requisitos
                    └── Agente → notificación con datos
```

**Archivos a entregar:**
- `cotizador-construccion.html` — formulario embebible
- `Code.gs` — Apps Script (doPost + email templates)
- `appsscript.json` — manifest (V8, ANYONE_ANONYMOUS, timezone America/Costa_Rica)

---

## 2. Formulario (cotizador-construccion.html)

### Campos
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Nombre completo | text | ✓ |
| Teléfono | tel | ✓ |
| Correo electrónico | email | ✓ |
| Monto de la obra (₡) | number | ✓ |
| website (honeypot) | text hidden | — |

### Estilo visual
- **Header:** gradiente azul INS (`#003DA5` → `#1E6EE8`), badge amarillo "RT CONSTRUCCIÓN INS", subtítulo "Recibí tu cotización al correo"
- **Formulario:** fondo blanco, una sola página sin pasos, campos limpios con labels visibles
- **Paleta:** `--ins-dark: #0B1F3D`, `--ins-blue: #003DA5`, `--ins-green: #00A859`, `--ins-yellow: #FFD100`
- **Footer del form:** "🔒 Tu información es confidencial · Cotización válida 15 días"
- **Responsive:** max-width 480px centrado, funciona en iframe de Google Sites

### Flujo de envío
1. Usuario llena los 4 campos y hace clic en "Enviar cotización"
2. Botón muestra spinner (deshabilitado durante el POST)
3. POST a la URL del Web App (`doPost`)
4. En éxito: botón se vuelve verde + tilde SVG que se dibuja animado + texto "Cotización enviada · revisá tu correo"
5. En error: mensaje rojo debajo del botón con opción de reintentar

### Seguridad
- Campo `website` (honeypot): si llega con valor → responder `OK` silenciosamente sin procesar
- Rate limit: 30 segundos entre envíos del mismo correo (via `CacheService`)
- Validación email: regex básico en cliente y servidor

---

## 3. Apps Script — Code.gs

### Función principal: `doPost(e)`

```
1. Extraer parámetros: nombre, telefono, correo, montoObra, website
2. Verificar honeypot → si tiene valor, retornar OK silencioso
3. Validar correo con regex
4. Verificar rate limit con CacheService (key: "rl_" + correo)
5. Parsear montoObra como número
6. Calcular:
   - montoAsegurado = montoObra × 0.35
   - prima          = montoAsegurado × 0.0398
7. Registrar en Google Sheets (hoja "Cotizaciones RT"):
   - timestamp, nombre, telefono, correo, montoObra, montoAsegurado, prima
8. Enviar correo al cliente (enviarEmailCliente)
9. Enviar notificación al agente (enviarNotificacionAgente)
10. Retornar JSON { status: "ok" }
```

### Función: `enviarEmailCliente(datos)`

Correo HTML enviado a la dirección del cliente con:
- Asunto: `Cotización Seguro RT Construcción · [Nombre]`
- Remitente: cuenta del Apps Script (correo de JC)

### Función: `enviarNotificacionAgente(datos)`

Correo simple enviado a `jhernandez@segurosdelins.com`:
- Asunto: `Nueva cotización RT · [Nombre] · [Teléfono]`
- Contenido: tabla con los datos del cliente + prima calculada + botón WhatsApp

### Hoja de Google Sheets
Nombre de la hoja: `"Cotizaciones RT"`  
Columnas: `Fecha | Nombre | Teléfono | Correo | Valor Obra | Monto Asegurado | Prima | Estado`

---

## 4. Email al cliente

### Estructura
```
[Header INS] — fondo #0B1F3D, logo INS, título "Cotización Seguro RT Construcción"

[Greeting]   — "Hola [Nombre]," + referencia de cotización

[Tu cotización]
  ┌─────────────────────────────────────┐
  │  Valor de la obra    ₡ xxx,xxx,xxx  │
  │  Prima anual          ₡  xx,xxx,xxx  │
  └─────────────────────────────────────┘
  Nota: "La cotización es válida por 15 días"

[Resumen de tu solicitud]
  Nombre:        [nombre]
  Correo:        [correo]
  Teléfono:      [telefono]
  Valor de obra: ₡ [montoObra]

[Requisitos para emitir el seguro]
  1. Complete y firme la solicitud adjunta (digital o manual)
  2. Envíenos la boleta de la Municipalidad o del CFIA
     (datos de la obra y solicitud del seguro)
  3. Si es sociedad: copia de la personería jurídica
  4. Formas de pago:
     · Depósito en las cuentas del INS
     · Link de pago con tarjeta

[CTA] Botón verde "Contactar al agente por WhatsApp"
      → wa.me/[numeroJC]?text=Hola,%20me%20interesa%20emitir%20mi%20seguro%20RT...

[Footer agente]
  Juan Carlos Hernández Vargas
  Agente de Seguros Exclusivo — Instituto Nacional de Seguros
  Licencia SUGESE 08-1310, Código 11013
  📱 [teléfono] | ✉ jhernandez@segurosdelins.com
  🌐 www.segurosdelins.com

[Footer SDI]
  Logo SVG Seguros Digitales SDI
  © Propiedad intelectual de Juan Carlos Hernández Vargas
  Seguros Digitales SDI — Todos los derechos reservados
  (mismo footer que en el cotizador de viaje)
```

### Estilo del email
- Responsive, max-width 600px
- Paleta INS: `#0B1F3D`, `#003DA5`, `#00A859`, `#FFD100`
- Font: system fonts (compatibilidad Gmail)
- Tarjeta de cotización con fondo verde para la prima (elemento visual principal)

---

## 5. Email de notificación al agente

```
Asunto: 🏗️ Nueva cotización RT — [Nombre] · Tel: [Teléfono]

[Tabla datos del cliente]
  Nombre:          [nombre]
  Teléfono:        [telefono]
  Correo:          [correo]
  Valor de obra:   ₡ [montoObra formateado]
  Monto asegurado: ₡ [montoAsegurado formateado]
  Prima calculada: ₡ [prima formateada]
  Fecha:           [timestamp]

[Botón] "WhatsApp → [Nombre]"
  → wa.me/506[telefono]?text=Hola%20[nombre]...
```

---

## 6. Datos del agente (constantes en Code.gs)

```javascript
const AGENTE = {
  nombre:   "Juan Carlos Hernández Vargas",
  licencia: "08-1310",
  codigo:   "11013",
  correo:   "jhernandez@segurosdelins.com",
  telefono: "+(506) 8882-1845",   // verificar número exacto
  whatsapp: "50688821845",        // verificar
  web:      "www.segurosdelins.com",
  notif:    "jhernandez@segurosdelins.com"
};
```

---

## 7. Fórmula de cálculo

```
Monto asegurado = Valor de la obra × 35%
Prima anual     = Monto asegurado  × 3.98%
```

Ejemplo con ₡39,715,083:
- Monto asegurado: ₡13,900,279
- Prima anual: ₡553,231

---

## 8. Diferencias con cotizador de viaje

| Aspecto | Viaje | RT Construcción |
|---------|-------|-----------------|
| Campos | nombre, correo, cédula, teléfono, destino, fechas | nombre, teléfono, correo, monto obra |
| Precio en página | No | No |
| Cálculo | Lookup en Sheets por edad/duración | Fórmula fija (35% × 3.98%) |
| Pasos | 3 pasos wizard | 1 página directa |
| Efecto éxito | Confeti | Checkmark SVG (profesional) |
| Email cliente | 13 secciones (boarding pass, opciones, etc.) | 5 secciones (cotización + requisitos) |
| Notif. agente | No | Sí (con WhatsApp directo) |

---

## 9. Out of scope

- No hay múltiples coberturas ni opciones de plan
- No hay cálculo por edad o perfil
- No hay adjunto de solicitud (se menciona en el email como paso a seguir)
- No hay integración con Firebase

---

## 10. Checklist de entrega

- [ ] `cotizador-construccion.html` — formulario funcional, embebible
- [ ] `Code.gs` — doPost + emails + Sheets logging
- [ ] `appsscript.json` — manifest correcto
- [ ] Email cliente probado en Gmail
- [ ] Notificación agente probada
- [ ] Honeypot + rate limit verificados
- [ ] URL del Web App lista para pegar en el HTML y en Google Sites
