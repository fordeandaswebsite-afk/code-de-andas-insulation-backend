"use server";
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.nextUrl.pathname === '/health'
});

// Security middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
});

// CORS middleware
const corsMiddleware = cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true
});

// Request origin verification
const verifyRequestOrigin = (req: NextRequest, res: NextResponse) => {
  const expectedOrigin = process.env.EXPECTED_ORIGIN || 'https://your-frontend-domain.com';
  const requestOrigin = req.headers.get('origin') || req.headers.get('referer');
  
  if (req.nextUrl.pathname === '/health' || req.nextUrl.pathname === '/api/proxy') {
    return true;
  }
  
  if (!requestOrigin) {
    return false;
  }
  
  const originUrl = new URL(requestOrigin);
  return originUrl.origin === expectedOrigin;
};

// Request signature verification
const verifyRequestSignature = async (req: NextRequest) => {
  const signature = req.headers.get('x-request-signature');
  const secret = process.env.REQUEST_SECRET;
  
  if (!secret) {
    return true; // Skip if no secret configured
  }
  
  if (!signature) {
    return false;
  }
  
  // Parse the request body once
  const body = JSON.stringify(await req.json());
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
};

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const originValid = verifyRequestOrigin(request, new NextResponse());
    if (!originValid) {
      return NextResponse.json(
        { error: 'Request origin verification failed', message: 'Request origin does not match expected origin' },
        { status: 403 }
      );
    }
    
    const signatureValid = verifyRequestSignature(request);
    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Invalid request signature' },
        { status: 401 }
      );
    }
    
    const requestData = await request.json();
    
    if (!requestData) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Request body is required' },
        { status: 400 }
      );
    }
    
    const jsonIoUrl = process.env.JSON_IO_URL || 'https://json.io';
    
    const response = await axios.post(`${jsonIoUrl}/api`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Next-API-Server/1.0'
      },
      timeout: 30000
    });
    
    return NextResponse.json(response.data, { status: response.status });
    
  } catch (error) {
    console.error('Error forwarding request to json.io:', error.message);
    
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: 'Upstream Error', message: error.response.data?.message || 'Error from json.io', status: error.response.status },
        { status: error.response.status }
      );
    } else if (axios.isAxiosError(error) && error.request) {
      return NextResponse.json(
        { error: 'Bad Gateway', message: 'Unable to reach json.io server' },
        { status: 502 }
      );
    } else {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname === '/health') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
  
  if (request.nextUrl.pathname === '/api/status') {
    return NextResponse.json({
      status: 'API running',
      timestamp: new Date().toISOString(),
      rateLimit: {
        windowMs: 60 * 1000,
        maxRequests: 1000
      }
    });
  }
  
  return NextResponse.json(
    { error: 'Not Found', message: `Route ${request.nextUrl.pathname} not found` },
    { status: 404 }
  );
}