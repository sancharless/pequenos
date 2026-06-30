import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || undefined;
    const payments = await dbHelper.getPayments(email);
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Erro ao carregar o histórico de depósitos.' }, { status: 500 });
  }
}
