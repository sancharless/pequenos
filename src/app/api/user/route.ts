import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET() {
  const user = await dbHelper.getUser();
  return NextResponse.json(user);
}
