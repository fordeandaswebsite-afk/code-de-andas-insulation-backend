"use server";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Environment variables
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || '6a2b305cf5f4af5e29e29215';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$GGCGcMCug/lSKR.V/BeaMu3EX/AIMr.DAXg6cx6qmUaIWVMWYBa2W';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// Security middleware
const verifyRequestSignature = async (req: NextRequest) => {
  const signature = req.headers.get('x-request-signature');
  const secret = process.env.REQUEST_SECRET;
  
  if (!secret) {
    return true; // Skip if no secret configured
  }
  
  if (!signature) {
    return false;
  }
  
  const body = JSON.stringify(await req.json());
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
};

// Rate limiting middleware
const rateLimit = async (req: NextRequest) => {
  const windowMs = 60 * 1000; // 1 minute
  const max = 1000; // 1000 requests per minute
  
  // Simple in-memory rate limiting (for production, use Redis or similar)
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // This is a simplified implementation - in production use a proper rate limiting solution
  return true; // Allow all requests for now
};

// Default reviews
const DEFAULT_REVIEWS = [
  { id: 1, rating: 5, text: "I would highly recommend De Andas Insulation. From initial meeting through the finished project, Oscar was communicative, thorough and professional.", author: "Jim V.", date: "Mar 2026" },
  { id: 2, rating: 5, text: "Great family business. Rates very reasonable, all work done professionally and as promised.", author: "Bruce C.", date: "Oct 2025" },
  { id: 3, rating: 5, text: "Completed within a week of quote, took less than a day. Will use again for spray foam.", author: "Brandon R.", date: "Sep 2025" },
  { id: 4, rating: 5, text: "Job done in timely manner, good work, kept area clean. Excellent service!", author: "Erv C.", date: "Sep 2025" },
  { id: 5, rating: 5, text: "Oscar was extremely responsive and professional. Honest about materials.", author: "Kevin L.", date: "Aug 2025" },
  { id: 6, rating: 5, text: "Professional, polite, delivered exactly what was promised on time. Great results.", author: "Dane M.", date: "Feb 2025" }
];

export async function GET(request: NextRequest) {
  try {
    // Apply security checks
    const signatureValid = await verifyRequestSignature(request);
    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Invalid request signature' },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const rateLimited = await rateLimit(request);
    if (!rateLimited) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Fetch reviews from JSONBin
    const response = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.record && Array.isArray(data.record) && data.record.length > 0) {
        return NextResponse.json(data.record);
      }
    }
    
    // Return default reviews if no data
    return NextResponse.json(DEFAULT_REVIEWS);
    
  } catch (error) {
    console.error('Error loading reviews:', error);
    return NextResponse.json(DEFAULT_REVIEWS);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply security checks
    const signatureValid = await verifyRequestSignature(request);
    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Invalid request signature' },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const rateLimited = await rateLimit(request);
    if (!rateLimited) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    const reviewData = await request.json();
    
    // Validate review data
    if (!reviewData || !reviewData.rating || !reviewData.text) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Rating and text are required' },
        { status: 400 }
      );
    }
    
    // Fetch existing reviews
    const getResponse = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    
    let reviews = DEFAULT_REVIEWS;
    if (getResponse.ok) {
      const data = await getResponse.json();
      reviews = data.record || DEFAULT_REVIEWS;
    }
    
    // Add new review
    const newId = reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
    
    const newReview = {
      id: newId,
      rating: parseInt(reviewData.rating),
      text: reviewData.text.trim(),
      author: (reviewData.author || 'Customer').trim(),
      date: dateStr
    };
    
    reviews.push(newReview);
    
    // Save to JSONBin
    const saveResponse = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(reviews)
    });
    
    if (saveResponse.ok) {
      return NextResponse.json(newReview, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Failed to save review', message: 'Database error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error saving review:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}