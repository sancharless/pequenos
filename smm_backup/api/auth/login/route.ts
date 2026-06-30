import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor, informe e-mail e senha.' },
        { status: 400 }
      );
    }

    const user = await dbHelper.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        { status: 401 }
      );
    }

    // Se o usuário não tem senha cadastrada (ex: auto-criado anteriormente),
    // definimos a senha que ele digitou agora como sua senha oficial!
    if (!user.passwordHash) {
      const passwordHash = hashPassword(password);
      if (supabase) {
        try {
          await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('email', email);
        } catch (err) {
          console.error('Failed to update password hash in Supabase:', err);
        }
      }
      user.passwordHash = passwordHash;
    } else {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'E-mail ou senha incorretos.' },
          { status: 401 }
        );
      }
    }

    // Remove passwordHash before returning to client
    const { passwordHash: _, ...clientUser } = user;

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: clientUser
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar login.' },
      { status: 500 }
    );
  }
}
