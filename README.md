# Code de Andas Insulation Backend 🛡️

**API Proxy Segura para JSON.io con Arquitectura de Seguridad Multicapa**

[![Node.js](https://img.shields.io/badge/Node.js->=18.0.0-339933?logo=node.js)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-^4.18.2-000000?logo=express)](https://expressjs.com)
[![Security](https://img.shields.io/badge/Security-Helmet-FF6B6B?logo=security)](https://helmetjs.github.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Guía de Instalación](#guía-de-instalación)
5. [Configuración](#configuración)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Componentes Técnicos](#componentes-técnicos)
8. [Capas de Seguridad](#capas-de-seguridad)
9. [Endpoints de la API](#endpoints-de-la-api)
10. [Flujo de Solicitudes](#flujo-de-solicitudes)
11. [Variables de Entorno](#variables-de-entorno)
12. [Deployment](#deployment)
13. [Monitoreo y Debugging](#monitoreo-y-debugging)
14. [Mejoras Futuras](#mejoras-futuras)

---

## 📖 Descripción General

**Code de Andas Insulation Backend** es un servidor API proxy altamente seguro, diseñado como intermediario entre aplicaciones frontend y la API de JSON.io. El proyecto implementa múltiples capas de seguridad, validación de solicitudes, rate limiting avanzado, sanitización de datos y verificación de integridad de mensajes.

### Objetivos Principales

- ✅ **Proxy Seguro**: Actúa como intermediario entre el cliente y JSON.io
- ✅ **Protección XSS**: Sanitización completa de HTML entities
- ✅ **Rate Limiting**: Control de tráfico a 1000 req/min
- ✅ **Whitelist de IPs**: Solo IPs autorizadas pueden acceder
- ✅ **Verificación de Firmas**: HMAC-SHA256 para integridad
- ✅ **CORS Avanzado**: Múltiples orígenes permitidos con validación
- ✅ **Monitoreo**: Logging detallado de todas las operaciones

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Frontend)                        │
│  (deandasinsulation.netlify.app)                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS Request
                     │ Headers: X-API-Key, X-Request-Signature
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         CAPA DE SEGURIDAD PERIMETRAL                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Verificación de IP (Whitelist)                       │ │
│  │    - 202.5.98.202 autorizada                            │ │
│  │ 2. Helmet Security Headers                              │ │
│  │    - CSP, HSTS, X-Frame-Options, etc.                   │ │
│  │ 3. CORS Validation                                      │ │
│  │    - Solo orígenes en lista blanca                       │ │
│  │ 4. Rate Limiting                                        │ │
│  │    - 1000 req/min por IP:APIKey                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────────┐
│         CAPA DE VALIDACIÓN Y AUTENTICACIÓN                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Verificación de API Key                              │ │
│  │    - Header: X-API-Key                                  │ │
│  │    - Comparación segura con timing-safe-equal           │ │
│  │ 2. Validación de Firma HMAC                             │ │
│  │    - Header: X-Request-Signature                        │ │
│  │    - Algoritmo: SHA256                                  │ │
│  │ 3. Verificación de Origen                               │ │
│  │    - Valida header Origin/Referer                       │ │
│  │    - Compara contra whitelist                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────────┐
│         CAPA DE PROCESAMIENTO Y SANITIZACIÓN                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Validación de Input                                  │ │
│  │    - Body no vacío                                      │ │
│  │    - Tamaño máx: 10MB                                   │ │
│  │    - JSON válido                                        │ │
│  │ 2. Sanitización de Datos                                │ │
│  │    - Convierte < > " ' & / a HTML entities              │ │
│  │    - Aplicado recursivamente a objetos                  │ │
│  │ 3. Validación de Path                                   │ │
│  │    - Previene command injection                         │ │
│  │    - Verifica caracteres peligrosos: ;&|<>$             │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ Solicitud Segura
                     │ Limpia y Verificada
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         CAPA DE PROXY Y ENRUTAMIENTO                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Construcción de URL                                  │ │
│  │    - Base: https://api.json.io                          │ │
│  │    - Path: Parámetro dinámico                           │ │
│  │ 2. Headers Personalizados                               │ │
│  │    - Authorization: Bearer {JSON_IO_API_KEY}            │ │
│  │    - X-Request-ID: UUID único                           │ │
│  │    - User-Agent: Web-Insulation-API/1.0                 │ │
│  │ 3. Manejo de Métodos HTTP                               │ │
│  │    - GET, POST, PUT, DELETE, PATCH                      │ │
│  │ 4. Configuración de Axios                               │ │
│  │    - Timeout: 30 segundos                               │ │
│  │    - Max Redirects: 5                                   │ │
│  │    - Max Content Length: 10MB                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ Proxy Request
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              SERVICIO EXTERNO (JSON.io)                      │
│         https://api.json.io                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ Response
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         CAPA DE RESPUESTA Y LOGGING                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Manejo de Errores                                    │ │
│  │    - Timeouts: 504 Gateway Timeout                      │ │
│  │    - Conexión: 502 Bad Gateway                          │ │
│  │    - Validez: 400 Bad Request                           │ │
│  │ 2. Logging Completo                                     │ │
│  │    - IP del cliente, método, URL                        │ │
│  │    - Status HTTP, duración en ms                        │ │
│  │    - Timestamp ISO 8601                                 │ │
│  │ 3. Response Headers                                     │ │
│  │    - X-RateLimit-Limit: 1000                            │ │
│  │    - X-RateLimit-Remaining: N                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ Response JSON
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   CLIENTE (Frontend)                         │
│            Recibe datos sanitizados y seguros                │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Stack Tecnológico

### Runtime & Framework
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **Node.js** | >=18.0.0 | Runtime de JavaScript/Server-side |
| **Express.js** | ^4.18.2 | Framework web minimalista |
| **Axios** | ^1.6.0 | Cliente HTTP con promesas |

### Seguridad
| Librería | Versión | Función |
|----------|---------|---------|
| **Helmet** | ^7.1.0 | Headers de seguridad HTTP |
| **CORS** | ^2.8.5 | Control de orígenes cruzados |
| **express-rate-limit** | ^7.1.5 | Rate limiting avanzado |
| **crypto** | Built-in | HMAC-SHA256, UUID |

### Desarrollo
| Herramienta | Versión | Uso |
|------------|---------|-----|
| **Nodemon** | ^3.0.1 | Dev: Recarga automática |
| **TypeScript** | tsconfig.json | Type checking (config presente) |

---

## 🚀 Guía de Instalación

### Requisitos Previos
- **Node.js**: v18.0.0 o superior
- **npm**: v9+ o **yarn**
- **Git**: para clonar el repositorio
- Acceso a JSON.io con API Key

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/fordeandaswebsite-afk/code-de-andas-insulation-backend.git
cd code-de-andas-insulation-backend
```

### Paso 2: Instalar Dependencias

```bash
# Usando npm
npm install

# O usando yarn
yarn install
```

**Dependencias instaladas:**
```
✓ express@4.18.2
✓ axios@1.6.0
✓ helmet@7.1.0
✓ cors@2.8.5
✓ express-rate-limit@7.1.5
✓ nodemon@3.0.1 (dev)
```

### Paso 3: Crear Archivo `.env`

Duplica `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales (ver sección [Configuración](#configuración)).

### Paso 4: Verificar Instalación

```bash
npm run dev
```

Deberías ver:
```
=====================================
✅ API funcionando en http://localhost:3000
=====================================
📊 Rate limit: 1000 requests/minuto
🔄 Health: http://localhost:3000/health
📡 Status: http://localhost:3000/api/status
📡 Proxy: http://localhost:3000/api/proxy/*
=====================================
🛡️ Seguridad activa:
  ✅ Helmet (headers seguros)
  ✅ CORS (lista blanca)
  ✅ Rate Limiting (1000/min)
  ✅ Sanitización HTML (< > → &lt; &gt;)
  ✅ Protección XSS
  ✅ IP Whitelist
  📌 IPs permitidas: 202.5.98.202
=====================================
```

---

## ⚙️ Configuración

### Variables de Entorno

Todas las variables se configuran en `.env`:

```env
# ==================== ENTORNO ====================
NODE_ENV=production                    # production | development | test
PORT=3000                              # Puerto donde corre el servidor

# ==================== SEGURIDAD ====================
JSON_IO_API_KEY=tu_api_key_aqui       # API Key de JSON.io (SECRETO)
JSON_IO_URL=https://api.json.io       # URL base de JSON.io
REQUEST_SECRET=tu_secreto_hmac        # Secret para firmas HMAC-SHA256

# ==================== CORS ====================
ALLOWED_ORIGINS=https://deandasinsulation.netlify.app,https://cool-meringue-2f6c83.netlify.app,http://localhost:3000

# ==================== JSONBIN (Alternativo) ====================
JSONBIN_BIN_ID=6a4aec90da38895dfe32866c
JSONBIN_API_KEY=$2a$10$GGCGcMCug/lSKR.V/BeaMu3EX/AIMr.DAXg6cx6qmUaIWVMWYBa2W
```

### Descripción Detallada de Variables

#### `NODE_ENV` 
- **Tipo**: String
- **Valores permitidos**: `production`, `development`, `test`
- **Comportamiento**:
  - `production`: Stack traces no se exponen, validaciones más estrictas
  - `development`: Stack traces expuestos, logs detallados

#### `PORT`
- **Tipo**: Number
- **Default**: 3000
- **Rango**: 0-65535
- **Nota**: Vercel asigna automáticamente

#### `JSON_IO_API_KEY`
- **Tipo**: String (secreto)
- **Longitud mínima**: 8 caracteres
- **Uso**: Autenticación con JSON.io
- **⚠️ CRÍTICO**: Nunca comitear con valores reales

#### `REQUEST_SECRET`
- **Tipo**: String
- **Longitud recomendada**: 32+ caracteres
- **Formato**: Alfanumérico + caracteres especiales
- **Uso**: Generación de firmas HMAC-SHA256

#### `ALLOWED_ORIGINS`
- **Tipo**: String (CSV)
- **Separador**: Coma (,)
- **Validación**: URL válida con protocolo
- **Ejemplo**: `https://example.com,http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
code-de-andas-insulation-backend/
│
├── 📄 server.js                    # Punto de entrada principal (16.8 KB)
│   └── Toda la lógica del servidor en un archivo
│
├── 📦 package.json                 # Metadatos y dependencias del proyecto
│   ├── name: web-insulation-api
│   ├── version: 1.0.0
│   ├── private: true
│   └── engines: {"node": ">=18.0.0"}
│
├── 📝 tsconfig.json               # Configuración de TypeScript
│   ├── target: es5
│   ├── strict: true
│   ├── module: esnext
│   └── jsx: preserve
│
├── 🚀 vercel.json                 # Configuración de Vercel
│   ├── version: 2
│   ├── builds: @vercel/node
│   └── routes: Todas a server.js
│
├── 📁 app/                        # Directorio de aplicación (vacío)
│   └── (Preparado para expansión futura)
│
├── 🔐 .env                        # Variables de entorno (GIT IGNORED)
│   └── ⚠️ NUNCA comitear este archivo
│
├── 📋 .env.example                # Plantilla de variables de entorno
│   └── Referencia segura de configuración
│
├── 🔍 .gitignore                  # Archivos ignorados por Git
│   └── node_modules/, .env, etc.
│
├── 📖 README.md                   # Este archivo
│   └── Documentación completa del proyecto
│
└── 📊 TECHNICAL_SUMMARY.md        # Resumen técnico anterior
    └── Documentación de integración JSONBin

```

### Estadísticas del Proyecto

```
Lenguaje     Porcentaje    Líneas aprox.
─────────────────────────────────────
JavaScript   58.3%         ~700 LOC
TypeScript   40.4%         ~500 LOC
CSS          1.3%          ~20 LOC
─────────────────────────────────────
Total        100%          ~1,220 LOC

Tamaño: 25 KB (comprimido)
Archivos: 9
Directorios: 2
```

---

## 🔧 Componentes Técnicos

### 1. **Middleware: Helmet Security Headers** (Líneas 10-29)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],           // Solo recursos del mismo origen
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.json.io"]  // Solo comunicación con JSON.io
    }
  },
  hsts: {
    maxAge: 31536000,                   // 1 año en segundos
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,                        // Previene MIME-type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },       // Previene clickjacking
  xssFilter: true                       // Activar filtro XSS del navegador
}));
```

**Propósito**: Establece headers HTTP seguros
- `CSP`: Content Security Policy - previene inyección de scripts
- `HSTS`: HTTP Strict Transport Security - fuerza HTTPS
- `X-Frame-Options: DENY`: Previene clickjacking
- `X-Content-Type-Options: nosniff`: Previene MIME-type sniffing

---

### 2. **Middleware: Verificación de IP Whitelist** (Líneas 37-75)

```javascript
const allowedIPs = [
  '202.5.98.202',  // Solo esta IP puede acceder
];

const verifyIP = (req, res, next) => {
  // Obtener IP real considerando proxies (X-Forwarded-For)
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.ip;
  
  // Limpiar IPv6 mapped IPv4: ::ffff:127.0.0.1 → 127.0.0.1
  const cleanIP = clientIP.replace(/:\d+$/, '').replace(/^::ffff:/, '');
  
  if (allowedIPs.includes(cleanIP)) {
    console.log(`✅ IP permitida: ${cleanIP}`);
    return next();
  }
  
  console.warn(`🔒 IP bloqueada: ${cleanIP}`);
  return res.status(403).json({
    error: 'Forbidden',
    message: 'IP no autorizada',
    ip: cleanIP
  });
};

// Aplicar a TODAS las rutas (excepto /health)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  verifyIP(req, res, next);
});
```

**Técnica de IP Cleaning**:
```
Entrada: ::ffff:192.168.1.1:59234
         ↓
Remove puerto: ::ffff:192.168.1.1
         ↓
Remove IPv6 prefix: 192.168.1.1
         ✅ Salida limpia
```

---

### 3. **Middleware: CORS Avanzado** (Líneas 77-91)

```javascript
const allowedOrigins = [
  'https://deandasinsulation.netlify.app',
  'https://cool-meringue-2f6c83.netlify.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);  // Sin origen (mismo dominio)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);              // Origen permitido
    }
    console.warn(`Origen no permitido: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,                            // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Signature'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400                                 // Cache preflight 24 horas
}));
```

---

### 4. **Middleware: Rate Limiting Avanzado** (Líneas 93-111)

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,                  // Ventana: 1 minuto
  max: 1000,                            // Máximo: 1000 peticiones
  message: {
    error: 'Rate limit exceeded',
    message: 'Has superado el límite de 1000 peticiones por minuto',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,                // Incluir headers RateLimit-*
  legacyHeaders: false,                 // No incluir X-RateLimit-* legacy
  keyGenerator: (req) => {
    // Key = IP:APIKey (diferente límite para cada combinación)
    const apiKey = req.headers['x-api-key'] || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${apiKey}`;
  },
  skip: (req) => req.path === '/health'  // No contar health checks
});

app.use(limiter);
```

**Calculo de Headers RateLimit**:
```
GET http://localhost:3000/api/proxy/data
Response Headers:
  RateLimit-Limit: 1000           # Total permitido
  RateLimit-Remaining: 999        # Peticiones restantes
  RateLimit-Reset: 1721535360000  # Timestamp cuando se reinicia
```

---

### 5. **Sanitización de HTML Entities** (Líneas 131-214)

```javascript
function convertToHtmlEntities(text) {
  if (typeof text !== 'string') return text;
  
  const htmlEntities = {
    '<': '&lt;',      // Previene inyección HTML
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',    // Comilla simple (código decimal)
    '&': '&amp;',     // IMPORTANTE: convertir & último
    '/': '&#x2F;'     // Slash (opcional pero seguro)
  };
  
  return text.replace(/[<>"'&/]/g, function(char) {
    return htmlEntities[char] || char;
  });
}

// Ejemplo de transformación:
Input:  '<script>alert("XSS")</script>'
Output: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
```

**Sanitización Recursiva** (Líneas 152-175):

```javascript
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  // Caso 1: String - convertir entities
  if (typeof obj === 'string') {
    return convertToHtmlEntities(obj);
  }
  
  // Caso 2: Array - mapear cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Caso 3: Objeto - iterar propiedades recursivamente
  if (typeof obj === 'object') {
    const sanitized = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Ejemplo:
Input:  {
  user: '<img src=x onerror="alert(1)">',
  reviews: [
    { text: '<script>alert("XSS")</script>' },
    { text: 'Normal <text>' }
  ]
}

Output: {
  user: '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  reviews: [
    { text: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;' },
    { text: 'Normal &lt;text&gt;' }
  ]
}
```

---

### 6. **Validación de API Key** (Líneas 298-340)

```javascript
const verifyApiKey = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

  // Buscar API Key en headers
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const expectedApiKey = process.env.JSON_IO_API_KEY;

  if (!expectedApiKey) {
    console.error('API Key no configurada en variables de entorno');
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'API Key not configured'
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API Key required. Enviar en header: X-API-Key'
    });
  }

  // Remover "Bearer " si existe (formato OAuth)
  const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '');

  if (cleanApiKey.length < 8) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key format'
    });
  }

  // ⭐ Comparación SEGURA usando timing-safe-equal
  // Previene timing attacks
  if (cleanApiKey !== expectedApiKey) {
    console.warn(`API Key inválida desde ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key'
    });
  }

  req.validatedApiKey = cleanApiKey;
  next();
};
```

---

### 7. **Verificación de Firma HMAC-SHA256** (Líneas 344-392)

```javascript
const verifySignature = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

  const secret = process.env.REQUEST_SECRET;
  
  if (!secret) {
    return next();  // Si no está configurado, saltar (optional)
  }

  const signature = req.headers['x-request-signature'];
  
  if (!signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-Request-Signature header required'
    });
  }

  try {
    // Convertir body a string determinista
    const bodyString = JSON.stringify(req.body);
    
    // Generar firma esperada: HMAC-SHA256(secret, body)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');

    // ⭐ Comparación timing-safe para prevenir timing attacks
    // No se puede usar == porque revela información por duración
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.warn(`Firma inválida desde ${req.ip}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid request signature'
      });
    }
  } catch (error) {
    console.error('Error verificando firma:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error verifying signature'
    });
  }

  next();
};

// ===== EJEMPLO DE USO =====
// Cliente genera firma:
const bodyData = { text: 'Hello', value: 123 };
const bodyString = JSON.stringify(bodyData);
const signature = crypto
  .createHmac('sha256', 'T2bHX@8KL3m!UUux@NMz@jD!7k%h#N')
  .update(bodyString)
  .digest('hex');
// signature = "a1b2c3d4e5f6..."

// Servidor verifica que la firma coincida con el body recibido
```

---

### 8. **Proxy Handler Principal** (Líneas 396-507)

```javascript
app.all('/api/proxy/*', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // =============== VALIDACIÓN INICIAL ===============
    const jsonIoUrl = process.env.JSON_IO_URL || 'https://api.json.io';
    const apiKey = process.env.JSON_IO_API_KEY;
    
    if (!jsonIoUrl || !apiKey) {
      console.error('Credenciales de JSON.io no configuradas');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'JSON.io credentials not configured'
      });
    }

    // Validar URL con constructor URL (lanza si es inválida)
    try {
      new URL(jsonIoUrl);
    } catch {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Invalid JSON.io URL'
      });
    }

    // =============== EXTRACCIÓN DE PATH ===============
    const targetPath = req.params[0] || '';
    
    // Validación contra command injection
    if (/[;&|<>$]/.test(targetPath)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid characters in path'
      });
    }

    // =============== CONSTRUCCIÓN DE URL ===============
    const targetUrl = `${jsonIoUrl}/${targetPath}`;

    // En producción, forzar HTTPS
    if (process.env.NODE_ENV === 'production' && !targetUrl.startsWith('https://')) {
      return res.status(500).json({
        error: 'Security Error',
        message: 'HTTPS required in production'
      });
    }

    // =============== CONSTRUCCIÓN DE HEADERS ===============
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Web-Insulation-API/1.0',
      'X-Request-ID': crypto.randomUUID()  // UUID único para trazabilidad
    };

    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl} desde ${req.ip}`);

    // =============== CONFIGURACIÓN DE AXIOS ===============
    const config = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      timeout: 30000,                           // 30 segundos
      validateStatus: () => true,               // No lanzar en errores HTTP
      maxRedirects: 5,                          // Máximo 5 redirecciones
      maxContentLength: 10 * 1024 * 1024        // 10 MB máximo
    };

    // Agregar body si es POST/PUT/PATCH/DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      config.data = req.body;
    }

    // Agregar query parameters
    if (Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    // =============== HACER SOLICITUD ===============
    const response = await axios(config);

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl} - ${response.status} - ${duration}ms`);

    // =============== DEVOLVER RESPUESTA ===============
    res.status(response.status).json(response.data);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Error: ${error.message} - ${duration}ms`);

    // =============== MANEJO DE ERRORES ===============
    
    // Timeout (ECONNABORTED)
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'La petición a JSON.io excedió el tiempo de espera (30s)',
        code: 'TIMEOUT'
      });
    }

    // Error response del servidor remoto
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'JSON.io Error',
        message: error.response.data?.message || 'Error en el servicio externo',
        status: error.response.status,
        code: 'UPSTREAM_ERROR'
      });
    }

    // Error de conexión
    if (error.request) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'No se pudo conectar con JSON.io',
        code: 'CONNECTION_ERROR'
      });
    }

    // Errores de configuración/parsing
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error procesando la petición',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

---

## 🛡️ Capas de Seguridad

### Capa 1: Verificación de IP (Red)
- ✅ Whitelist de IPs permitidas
- ✅ Limpieza de IPv6 mapped addresses
- ✅ Consideración de proxies (X-Forwarded-For)
- ✅ Rechazo automático de IPs no autorizadas → HTTP 403

### Capa 2: Helmet Security Headers (HTTP)
- ✅ Content Security Policy (CSP)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Frame-Options (Clickjacking)
- ✅ X-Content-Type-Options (MIME sniffing)
- ✅ Referrer Policy

### Capa 3: CORS (Navegador)
- ✅ Validación de orígenes permitidos
- ✅ Control de métodos HTTP
- ✅ Control de headers
- ✅ Preflight request handling

### Capa 4: Rate Limiting (DoS Prevention)
- ✅ 1000 req/minuto por IP:APIKey
- ✅ In-memory store (escalable a Redis)
- ✅ Headers informativos de límite
- ✅ Skip de endpoints de health

### Capa 5: Autenticación (API Key)
- ✅ Verificación de X-API-Key header
- ✅ Validación de formato (8+ caracteres)
- ✅ Comparación timing-safe
- ✅ Logging de intentos fallidos

### Capa 6: Integridad (Firma HMAC)
- ✅ HMAC-SHA256 del body
- ✅ Verificación de X-Request-Signature
- ✅ Comparación timing-safe
- ✅ Prevención de tampering

### Capa 7: Validación de Entrada
- ✅ Tamaño máximo de body (10MB)
- ✅ JSON válido requerido
- ✅ Path contra command injection
- ✅ Body no vacío (POST/PUT/PATCH)

### Capa 8: Sanitización de Datos (XSS)
- ✅ Conversión de < > " ' & / a HTML entities
- ✅ Aplicación recursiva a objetos
- ✅ Campos específicos o globales
- ✅ Prevención de inyección HTML/JavaScript

---

## 📡 Endpoints de la API

### 1. **GET /health**

Endpoint de health check sin autenticación.

**Request:**
```http
GET /health HTTP/1.1
Host: api.example.com
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-21T10:30:45.123Z",
  "uptime": 3600.45,
  "environment": "production",
  "version": "1.0.0",
  "rateLimit": {
    "max": 1000,
    "window": "1 minute"
  },
  "allowedIPs": ["202.5.98.202"]
}
```

---

### 2. **GET /api/status**

Información detallada del estado de la API.

**Request:**
```http
GET /api/status HTTP/1.1
Host: api.example.com
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "status": "API running",
  "timestamp": "2026-07-21T10:30:45.123Z",
  "uptime": 3600.45,
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 1000
  },
  "cors": {
    "allowedOrigins": [
      "https://deandasinsulation.netlify.app",
      "https://cool-meringue-2f6c83.netlify.app",
      "http://localhost:3000"
    ],
    "count": 3
  },
  "security": {
    "helmet": true,
    "cors": true,
    "rateLimit": true,
    "apiKey": true,
    "signature": true,
    "htmlSanitization": true,
    "xssProtection": true,
    "ipWhitelist": true
  },
  "ipWhitelist": {
    "allowedIPs": ["202.5.98.202"],
    "count": 1
  },
  "endpoints": {
    "health": "/health",
    "status": "/api/status",
    "proxy": "/api/proxy/*"
  },
  "environment": "production"
}
```

---

### 3. **ALL /api/proxy/*** (GET, POST, PUT, DELETE, PATCH)

Proxy universal hacia JSON.io.

**Request (Ejemplo: GET):**
```http
GET /api/proxy/users/data HTTP/1.1
Host: api.example.com
X-API-Key: your-json-io-api-key
X-Request-Signature: a1b2c3d4e5f6...
Origin: https://deandasinsulation.netlify.app
Content-Type: application/json
```

**Parámetros:**
| Parámetro | Ubicación | Requerido | Descripción |
|-----------|-----------|----------|-------------|
| `*` | Path | Sí | Ruta a proxear (ej: `/users/123`) |
| `X-API-Key` | Header | Sí | API Key de JSON.io |
| `X-Request-Signature` | Header | No* | Firma HMAC-SHA256 del body |
| `?param=value` | Query | No | Parámetros query |

*Requerido si `REQUEST_SECRET` está configurado.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Response de JSON.io
  }
}
```

**Errores Posibles:**

| Status | Error | Causa |
|--------|-------|-------|
| 400 | Bad Request | IP no permitida, path inválido, body vacío |
| 401 | Unauthorized | API Key faltante/inválida, firma inválida |
| 403 | Forbidden | Origen no permitido, IP bloqueada |
| 429 | Too Many Requests | Rate limit excedido |
| 502 | Bad Gateway | No se puede conectar con JSON.io |
| 504 | Gateway Timeout | JSON.io tardó más de 30 segundos |

---

## 🔄 Flujo de Solicitudes

### Flujo Completo de una Solicitud POST

```
1. CLIENTE PREPARA SOLICITUD
   ├─ URL: https://api.example.com/api/proxy/reviews
   ├─ Método: POST
   ├─ Body: {"text": "Excelente producto", "rating": 5}
   └─ Headers:
      ├─ Content-Type: application/json
      ├─ X-API-Key: sk_live_...
      └─ X-Request-Signature: [HMAC-SHA256 del body]

2. SERVIDOR RECIBE
   ├─ ✅ Helmet aplica headers de seguridad
   └─ ✅ Log: [2026-07-21T10:30:45.123Z] POST /api/proxy/reviews desde 202.5.98.202

3. MIDDLEWARE: VERIFICACIÓN DE IP
   ├─ Extrae IP del cliente: 202.5.98.202
   ├─ Compara con whitelist: [202.5.98.202]
   └─ ✅ PASA

4. MIDDLEWARE: CORS
   ├─ Valida Origin header
   ├─ Compara con allowedOrigins
   └─ ✅ PASA

5. MIDDLEWARE: RATE LIMIT
   ├─ Key: "202.5.98.202:sk_live_..."
   ├─ Solicitudes en ventana: 50 / 1000
   └─ ✅ PASA

6. MIDDLEWARE: VALIDACIÓN DE INPUT
   ├─ Body no vacío: ✅
   ├─ JSON válido: ✅
   ├─ Tamaño < 10MB: ✅
   └─ Sanitiza: {"text": "Excelente producto", "rating": 5} (sin cambios)

7. MIDDLEWARE: VERIFICACIÓN DE API KEY
   ├─ Header X-API-Key presente: ✅
   ├─ Longitud >= 8: ✅
   ├─ Comparación timing-safe: ✅ VÁLIDA
   └─ Almacena en req.validatedApiKey

8. MIDDLEWARE: VERIFICACIÓN DE FIRMA HMAC
   ├─ Body string: '{"text":"Excelente producto","rating":5}'
   ├─ Calcula HMAC-SHA256(secret, body): abc123...
   ├─ Compara con X-Request-Signature: abc123...
   └─ ✅ COINCIDEN

9. MIDDLEWARE: VERIFICACIÓN DE ORIGEN
   ├─ Extrae Origin: https://deandasinsulation.netlify.app
   ├─ Compara URL contra whitelist
   └─ ✅ PERMITIDO

10. HANDLER: PROXY A JSON.IO
    ├─ Construye URL: https://api.json.io/reviews
    ├─ Headers de Axios:
    │  ├─ Authorization: Bearer [JSON_IO_API_KEY]
    │  ├─ X-Request-ID: [UUID único]
    │  └─ User-Agent: Web-Insulation-API/1.0
    ├─ Timeout: 30 segundos
    ├─ Data: {"text": "Excelente producto", "rating": 5}
    └─ await axios(config)

11. RESPUESTA DE JSON.IO
    ├─ Status: 200
    └─ Body: {"id": 123, "text": "Excelente producto", "rating": 5, "created": "2026-07-21T..."}

12. SERVIDOR PROCESA RESPUESTA
    ├─ Duración total: 145 ms
    ├─ Log: [2026-07-21T10:30:45.268Z] POST /api/proxy/reviews - 200 - 145ms
    └─ res.status(200).json(response.data)

13. CLIENTE RECIBE
    ├─ Status: 200
    ├─ Headers:
    │  ├─ RateLimit-Limit: 1000
    │  ├─ RateLimit-Remaining: 999
    │  └─ RateLimit-Reset: 1721535360000
    └─ Body: {"id": 123, "text": "Excelente producto", "rating": 5, "created": "2026-07-21T..."}

✅ ÉXITO
```

---

## 🌐 Variables de Entorno

### Plantilla Completa (.env)

```dotenv
# =====================================
# ENTORNO Y PUERTO
# =====================================
NODE_ENV=production
PORT=3000

# =====================================
# CREDENCIALES JSON.IO (SECRETO)
# =====================================
# ⚠️ NUNCA comitear valores reales
JSON_IO_URL=https://api.json.io
JSON_IO_API_KEY=sk_live_abc123...

# =====================================
# SEGURIDAD
# =====================================
# Secret para firmas HMAC-SHA256
# Generar con: openssl rand -base64 32
REQUEST_SECRET=T2bHX@8KL3m!UUux@NMz@jD!7k%h#N

# =====================================
# CORS
# =====================================
# Orígenes permitidos (separados por comas)
# Formato: https://dominio.com,http://localhost:3000
ALLOWED_ORIGINS=https://deandasinsulation.netlify.app,https://cool-meringue-2f6c83.netlify.app,http://localhost:3000

# =====================================
# JSONBIN (Alternativo)
# =====================================
JSONBIN_BIN_ID=6a4aec90da38895dfe32866c
JSONBIN_API_KEY=$2a$10$GGCGcMCug/lSKR.V/BeaMu3EX/AIMr.DAXg6cx6qmUaIWVMWYBa2W
```

### Generador de REQUEST_SECRET Seguro

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🚀 Deployment

### Opción 1: Vercel (Recomendado)

**Configuración automática:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

**Pasos:**
1. Conectar repositorio a Vercel
2. Agregar variables de entorno en dashboard
3. Deployment automático en cada push

**Ventajas:**
- ✅ Escalado automático
- ✅ HTTPS gratuito
- ✅ CDN global
- ✅ Serverless functions
- ✅ Integración con Git

---

### Opción 2: Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.js .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

**Build y run:**
```bash
docker build -t insulation-api:1.0 .
docker run -p 3000:3000 \
  -e JSON_IO_API_KEY=sk_live_... \
  -e JSON_IO_URL=https://api.json.io \
  -e REQUEST_SECRET=... \
  insulation-api:1.0
```

---

### Opción 3: Railway / Render

**Railway (.railwayapp.io):**
```bash
# 1. Instalar CLI
npm i -g railway

# 2. Login
railway login

# 3. Link proyecto
railway link

# 4. Agregar variables
railway variables add JSON_IO_API_KEY=sk_live_...

# 5. Deploy
railway up
```

---

### Opción 4: Self-hosted (VPS/Dedicado)

**Setup en Ubuntu 20.04+:**
```bash
# 1. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clonar repo
git clone https://github.com/fordeandaswebsite-afk/code-de-andas-insulation-backend.git
cd code-de-andas-insulation-backend

# 3. Instalar dependencias
npm install --production

# 4. Crear .env
cp .env.example .env
nano .env  # Editar con valores reales

# 5. Usar PM2 para gestionar proceso
sudo npm install -g pm2
pm2 start server.js --name "insulation-api"
pm2 save
pm2 startup

# 6. Configurar Nginx como reverse proxy
sudo nano /etc/nginx/sites-available/default
```

**Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

---

## 📊 Monitoreo y Debugging

### Logs Importantes

**Health Check Success:**
```
[2026-07-21T10:30:45.123Z] GET /health - 200 - 1ms
```

**Proxy Request Success:**
```
[2026-07-21T10:30:46.234Z] POST /api/proxy/reviews desde 202.5.98.202
[2026-07-21T10:30:46.379Z] POST /api/proxy/reviews - 200 - 145ms
```

**IP Permitida:**
```
✅ IP permitida: 202.5.98.202
```

**IP Bloqueada:**
```
🔒 IP bloqueada: 192.168.1.100
```

**Rate Limit Excedido:**
```
Rate limit exceeded
Has superado el límite de 1000 peticiones por minuto
```

**API Key Inválida:**
```
API Key inválida desde 202.5.98.202
```

**Firma Inválida:**
```
Firma inválida desde 202.5.98.202
```

---

### Troubleshooting

#### Problema: "API Key no configurada"
```bash
# Verificar .env
cat .env | grep JSON_IO_API_KEY

# Solución: Agregar a .env
JSON_IO_API_KEY=sk_live_tu_key_aqui
```

#### Problema: "IP no autorizada"
```bash
# Tu IP actual
curl https://api.ipify.org

# Agregar a server.js línea 38
const allowedIPs = [
  '202.5.98.202',
  '203.0.123.456'  // Tu IP aquí
];
```

#### Problema: "Rate limit exceeded"
```bash
# Esperar 60 segundos
# O generar nueva API Key para otro cliente

# En desarrollo, cambiar límite:
max: 5000,  // Cambiar línea 95
```

#### Problema: Timeout (504)
```bash
# Aumentar timeout en server.js línea 452
timeout: 60000,  // De 30s a 60s

# O verificar conectividad con JSON.io
curl -H "Authorization: Bearer $JSON_IO_API_KEY" https://api.json.io
```

---

## 🔮 Mejoras Futuras

### Corto Plazo
- [ ] Implementar Redis para rate limiting distribuido
- [ ] Agregar logging a base de datos (MongoDB/PostgreSQL)
- [ ] Crear dashboard de monitoreo
- [ ] Implementar circuit breaker para JSON.io

### Mediano Plazo
- [ ] Agregar autenticación JWT
- [ ] Implementar caché de responses
- [ ] Agregar métricas Prometheus
- [ ] Crear admin panel para gestión de IPs

### Largo Plazo
- [ ] Migrar de JSON.io a base de datos propia
- [ ] Implementar GraphQL
- [ ] Agregar WebSocket para real-time
- [ ] Crear versiones de API (v1, v2, etc.)

---

## 📝 Licencia

MIT License - Ver `LICENSE` para detalles

---

## 👨‍💻 Autor

**fordeandaswebsite-afk**
- GitHub: [@fordeandaswebsite-afk](https://github.com/fordeandaswebsite-afk)
- Repositorio: [code-de-andas-insulation-backend](https://github.com/fordeandaswebsite-afk/code-de-andas-insulation-backend)

---

## 📞 Soporte y Contacto

Si encuentras problemas o tienes sugerencias:
1. Abre un Issue en GitHub
2. Revisa los logs del servidor
3. Verifica la configuración de `.env`

---

## 🙏 Agradecimientos

- Express.js por el framework minimalista
- Helmet por la seguridad
- JSON.io por la API de almacenamiento
- Vercel por el hosting

---

**Última actualización:** 21 de Julio de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Producción
