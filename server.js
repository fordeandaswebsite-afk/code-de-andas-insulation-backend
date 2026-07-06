const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.json.io"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  xssFilter: true
}));

const allowedOrigins = [
  'https://deandasinsulation.netlify.app',
  'https://cool-meringue-2f6c83.netlify.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Origen no permitido: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Signature'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: {
    error: 'Rate limit exceeded',
    message: 'Has superado el límite de 1000 peticiones por minuto',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${apiKey}`;
  },
  skip: (req) => req.path === '/health'
});

app.use(limiter);

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ============================================
// SISTEMA DE CONVERSIÓN DE < Y > A HTML ENTITIES
// ============================================

// Función para convertir caracteres peligrosos a HTML entities
function convertToHtmlEntities(text) {
  if (typeof text !== 'string') return text;
  
  const htmlEntities = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '&': '&amp;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[<>"'&/]/g, function(char) {
    return htmlEntities[char] || char;
  });
}

// Función recursiva para sanitizar objetos completos
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return convertToHtmlEntities(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
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

// Función para sanitizar SOLO campos específicos (texto, review, comentarios)
function sanitizeSensitiveFields(obj) {
  if (obj === null || obj === undefined) return obj;
  
  // Campos que pueden contener texto peligroso
  const sensitiveFields = [
    'text', 'review', 'comment', 'message', 'name', 'author', 
    'title', 'description', 'content', 'body', 'feedback',
    'opinion', 'reviewText', 'commentText'
  ];
  
  if (typeof obj === 'string') {
    return convertToHtmlEntities(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveFields(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Si es un campo sensible, sanitizar
        if (sensitiveFields.includes(key.toLowerCase())) {
          sanitized[key] = convertToHtmlEntities(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitized[key] = sanitizeSensitiveFields(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }
  
  return obj;
}

// ============================================
// MIDDLEWARE DE SANITIZACIÓN MEJORADO
// ============================================

const validateInput = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El body de la petición no puede estar vacío'
      });
    }

    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > 10 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: 'El body excede el límite de 10MB'
      });
    }

    // === NUEVO: Sanitización completa con conversión de < y > ===
    // Opción 1: Sanitizar TODOS los strings (más seguro)
    req.body = sanitizeObject(req.body);
    
    // Opción 2: Sanitizar SOLO campos sensibles (menos intrusivo)
    // req.body = sanitizeSensitiveFields(req.body);
  }

  next();
};

app.use(validateInput);

const verifyOrigin = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

  const requestOrigin = req.headers.origin || req.headers.referer;
  
  if (!requestOrigin) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request origin required'
      });
    }
    return next();
  }

  try {
    const originUrl = new URL(requestOrigin);
    const isAllowed = allowedOrigins.some(allowed => {
      try {
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      console.warn(`Origen no verificado: ${requestOrigin}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request origin not authorized'
      });
    }
  } catch (error) {
    console.error('Error verificando origen:', error);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid origin format'
    });
  }

  next();
};

app.use(verifyOrigin);

const verifyApiKey = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

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

  const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '');

  if (cleanApiKey.length < 8) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key format'
    });
  }

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

app.use(verifyApiKey);

const verifySignature = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }

  const secret = process.env.REQUEST_SECRET;
  
  if (!secret) {
    return next();
  }

  const signature = req.headers['x-request-signature'];
  
  if (!signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-Request-Signature header required'
    });
  }

  try {
    const bodyString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');

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

app.use(verifySignature);

app.all('/api/proxy/*', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const jsonIoUrl = process.env.JSON_IO_URL || 'https://api.json.io';
    const apiKey = process.env.JSON_IO_API_KEY;
    
    if (!jsonIoUrl || !apiKey) {
      console.error('Credenciales de JSON.io no configuradas');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'JSON.io credentials not configured'
      });
    }

    try {
      new URL(jsonIoUrl);
    } catch {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Invalid JSON.io URL'
      });
    }

    const targetPath = req.params[0] || '';
    
    if (/[;&|<>$]/.test(targetPath)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid characters in path'
      });
    }

    const targetUrl = `${jsonIoUrl}/${targetPath}`;

    if (process.env.NODE_ENV === 'production' && !targetUrl.startsWith('https://')) {
      return res.status(500).json({
        error: 'Security Error',
        message: 'HTTPS required in production'
      });
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Web-Insulation-API/1.0',
      'X-Request-ID': crypto.randomUUID()
    };

    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl} desde ${req.ip}`);

    const config = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      timeout: 30000,
      validateStatus: () => true,
      maxRedirects: 5,
      maxContentLength: 10 * 1024 * 1024
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      config.data = req.body;
    }

    if (Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    const response = await axios(config);

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl} - ${response.status} - ${duration}ms`);

    res.status(response.status).json(response.data);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Error: ${error.message} - ${duration}ms`);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'La petición a JSON.io excedió el tiempo de espera (30s)',
        code: 'TIMEOUT'
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'JSON.io Error',
        message: error.response.data?.message || 'Error en el servicio externo',
        status: error.response.status,
        code: 'UPSTREAM_ERROR'
      });
    }

    if (error.request) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'No se pudo conectar con JSON.io',
        code: 'CONNECTION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error procesando la petición',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    rateLimit: {
      max: 1000,
      window: '1 minute'
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'API running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 1000
    },
    cors: {
      allowedOrigins: allowedOrigins,
      count: allowedOrigins.length
    },
    security: {
      helmet: true,
      cors: true,
      rateLimit: true,
      apiKey: true,
      signature: !!process.env.REQUEST_SECRET,
      htmlSanitization: true,
      xssProtection: true
    },
    endpoints: {
      health: '/health',
      status: '/api/status',
      proxy: '/api/proxy/*'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `El endpoint '${req.originalUrl}' no existe`,
    availableEndpoints: {
      health: {
        path: '/health',
        method: 'GET',
        description: 'Health check'
      },
      status: {
        path: '/api/status',
        method: 'GET',
        description: 'API status'
      },
      proxy: {
        path: '/api/proxy/*',
        method: 'ALL',
        description: 'Proxy a JSON.io'
      }
    },
    requiredHeaders: {
      'X-API-Key': 'Tu API Key de JSON.io',
      'X-Request-Signature': 'Opcional - Firma HMAC-SHA256 del body'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  
  const errorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'Error interno del servidor'
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  console.log('Verificando configuración...');
  
  if (!process.env.JSON_IO_API_KEY) {
    console.warn('WARNING: JSON_IO_API_KEY no configurada');
  }
  
  if (!process.env.JSON_IO_URL) {
    console.warn('WARNING: JSON_IO_URL no configurada, usando default');
  }
  
  const server = app.listen(PORT, () => {
    console.log('\n=====================================');
    console.log(`API funcionando en http://localhost:${PORT}`);
    console.log('=====================================');
    console.log(`Rate limit: 1000 requests/minuto`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Status: http://localhost:${PORT}/api/status`);
    console.log(`Proxy: http://localhost:${PORT}/api/proxy/*`);
    console.log('=====================================');
    console.log('🛡️ Seguridad activa:');
    console.log('  ✅ Helmet (headers seguros)');
    console.log('  ✅ CORS (lista blanca)');
    console.log('  ✅ Rate Limiting (1000/min)');
    console.log('  ✅ Sanitización HTML (< > → &lt; &gt;)');
    console.log('  ✅ Protección XSS');
    console.log('=====================================');
  });

  process.on('SIGTERM', () => {
    console.log('Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
      console.log('Servidor cerrado');
      process.exit(0);
    });
  });
}