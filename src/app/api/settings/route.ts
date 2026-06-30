import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export const revalidate = 0;

export async function GET() {
  try {
    const settings = await dbHelper.getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
