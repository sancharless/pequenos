import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Por favor, informe o e-mail.' },
        { status: 400 }
      );
    }

    const user = await dbHelper.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'E-mail não cadastrado.' },
        { status: 404 }
      );
    }

    // Se fornecido senha, atualiza no banco
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
          { status: 400 }
        );
      }
      
      const newHash = hashPassword(password);
      const success = await dbHelper.updateUserPassword(email, newHash);
      if (!success) {
        return NextResponse.json(
          { error: 'Erro ao atualizar a senha.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Senha redefinida com sucesso!'
      });
    }

    // Se não fornecido senha, apenas confirma que o e-mail existe
    return NextResponse.json({
      success: true,
      message: 'E-mail verificado. Digite sua nova senha.'
    });
  } catch (error) {
    console.error('Error during password recovery:', error);
    return NextResponse.json(
      { error: 'Erro interno ao recuperar senha.' },
      { status: 500 }
    );
  }
}
