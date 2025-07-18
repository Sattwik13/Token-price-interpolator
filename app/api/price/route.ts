import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { getPriceWithInterpolation } from '../../../lib/services/priceService';

const priceRequestSchema = Joi.object({
  token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  network: Joi.string().valid('ethereum', 'polygon').required(),
  timestamp: Joi.number().integer().min(0).required()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = priceRequestSchema.validate(body);
    
    if (error) {
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    const { token, network, timestamp } = value;
    
    const result = await getPriceWithInterpolation(token, network, timestamp);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}