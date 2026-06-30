import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos obrigatórios.' },
        { status: 400 }
      );
    }

    const existingUser = await dbHelper.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado.' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await dbHelper.createUser({
      name,
      email,
      passwordHash,
      balance: 0.00
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário registrado com sucesso!',
      user
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta.' },
      { status: 500 }
    );
  }
}
