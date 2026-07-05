const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration - restrict to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Rate limiting: 1000 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});

app.use(limiter);

// Middleware to verify request origin
const verifyRequestOrigin = (req, res, next) => {
  const expectedOrigin = process.env.EXPECTED_ORIGIN || 'https://your-frontend-domain.com';
  const requestOrigin = req.headers.origin || req.headers.referer;
  
  // Skip verification for internal requests or health checks
  if (req.path === '/health' || req.path === '/api/proxy') {
    return next();
  }
  
  if (!requestOrigin) {
    return res.status(403).json({
      error: 'Request origin verification failed',
      message: 'Missing origin header'
    });
  }
  
  // Simple origin verification - in production, use more robust validation
  const originUrl = new URL(requestOrigin);
  if (originUrl.origin !== expectedOrigin) {
    return res.status(403).json({
      error: 'Request origin verification failed',
      message: 'Request origin does not match expected origin'
    });
  }
  
  next();
};

app.use(verifyRequestOrigin);

// JSON parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request signature verification (optional but recommended)
const verifyRequestSignature = (req, res, next) => {
  const signature = req.headers['x-request-signature'];
  const secret = process.env.REQUEST_SECRET;
  
  if (!secret) {
    return next(); // Skip if no secret configured
  }
  
  if (!signature) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Missing request signature'
    });
  }
  
  // Create HMAC signature of request body
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid request signature'
    });
  }
  
  next();
};

app.use(verifyRequestSignature);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API proxy endpoint to forward requests to json.io
app.post('/api/proxy', async (req, res) => {
  try {
    const jsonIoUrl = process.env.JSON_IO_URL || 'https://json.io';
    const requestData = req.body;
    
    // Validate request data
    if (!requestData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body is required'
      });
    }
    
    // Forward request to json.io
    const response = await axios.post(`${jsonIoUrl}/api`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node-API-Server/1.0'
      },
      timeout: 30000 // 30 second timeout
    });
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('Error forwarding request to json.io:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      res.status(error.response.status).json({
        error: 'Upstream Error',
        message: error.response.data?.message || 'Error from json.io',
        status: error.response.status
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Unable to reach json.io server'
      });
    } else {
      // Something happened in setting up the request
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    }
  }
});

// Additional API endpoints can be added here
app.get('/api/status', (req, res) => {
  res.json({
    status: 'API running',
    timestamp: new Date().toISOString(),
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 1000
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Rate limit: 1000 requests per minute`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;