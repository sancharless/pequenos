import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos.' },
        { status: 400 }
      );
    }

    const admin = await dbHelper.getAdminUser(email);
    if (!admin) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticado com sucesso!',
      user: {
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
