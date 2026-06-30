import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || undefined;
    const user = await dbHelper.getUser(email);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do usuário.' }, { status: 500 });
  }
}
