import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { scheduleHistoryFetch } from '../../../lib/services/queueService';

const scheduleRequestSchema = Joi.object({
  token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  network: Joi.string().valid('ethereum', 'polygon').required()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = scheduleRequestSchema.validate(body);
    
    if (error) {
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    const { token, network } = value;
    
    await scheduleHistoryFetch(token, network);
    
    return NextResponse.json({ 
      message: 'History fetch scheduled successfully',
      token,
      network 
    });
  } catch (error) {
    console.error('Schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule history fetch' },
      { status: 500 }
    );
  }
}