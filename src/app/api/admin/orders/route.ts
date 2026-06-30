import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export const revalidate = 0;

export async function GET() {
  try {
    const orders = await dbHelper.getOrders();
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
