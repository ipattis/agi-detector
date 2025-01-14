import { NextResponse } from 'next/server';
import { getCurrentMetrics } from '@/lib/crawler';

export async function GET() {
  try {
    const metrics = getCurrentMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
