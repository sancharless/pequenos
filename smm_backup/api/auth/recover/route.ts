import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbHelper } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

// Hash the OTP code with SHA-256 before storing
function hashOTP(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Generate a secure 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { step, email, code, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Por favor, informe o e-mail.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── STEP 1: Request OTP ────────────────────────────────────────────────────
    if (step === 'request' || (!step && !code && !password)) {
      const user = await dbHelper.getUserByEmail(normalizedEmail);
      if (!user) {
        // Return success even if email not found (prevents email enumeration)
        return NextResponse.json({
          success: true,
          message: 'Se este e-mail estiver cadastrado, você receberá o código em instantes.'
        });
      }

      const otp = generateOTP();
      const tokenHash = hashOTP(otp);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      await dbHelper.saveResetToken(normalizedEmail, tokenHash, expiresAt);

      const emailSent = await sendPasswordResetEmail(normalizedEmail, otp);

      if (!emailSent) {
        return NextResponse.json(
          { error: 'Falha ao enviar o e-mail de recuperação. Tente novamente.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Código enviado para o seu e-mail. Verifique sua caixa de entrada.'
      });
    }

    // ── STEP 2: Verify OTP ────────────────────────────────────────────────────
    if (step === 'verify') {
      if (!code || code.length !== 6) {
        return NextResponse.json({ error: 'Código inválido. Deve ter 6 dígitos.' }, { status: 400 });
      }

      const token = await dbHelper.getResetToken(normalizedEmail);
      if (!token) {
        return NextResponse.json(
          { error: 'Código expirado ou inválido. Solicite um novo código.' },
          { status: 400 }
        );
      }

      const inputHash = hashOTP(code.trim());
      if (inputHash !== token.tokenHash) {
        return NextResponse.json(
          { error: 'Código incorreto. Verifique e tente novamente.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Código verificado! Agora defina sua nova senha.'
      });
    }

    // ── STEP 3: Reset Password ────────────────────────────────────────────────
    if (step === 'reset') {
      if (!code || !password) {
        return NextResponse.json(
          { error: 'Código e nova senha são obrigatórios.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
          { status: 400 }
        );
      }

      const token = await dbHelper.getResetToken(normalizedEmail);
      if (!token) {
        return NextResponse.json(
          { error: 'Sessão de recuperação expirada. Solicite um novo código.' },
          { status: 400 }
        );
      }

      const inputHash = hashOTP(code.trim());
      if (inputHash !== token.tokenHash) {
        return NextResponse.json(
          { error: 'Código inválido. Solicite um novo código.' },
          { status: 400 }
        );
      }

      // Invalidate token (one-time use)
      await dbHelper.invalidateResetToken(normalizedEmail);

      // Update password
      const newHash = hashPassword(password);
      const success = await dbHelper.updateUserPassword(normalizedEmail, newHash);

      if (!success) {
        return NextResponse.json({ error: 'Erro ao atualizar a senha.' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Senha redefinida com sucesso! Faça login com sua nova senha.'
      });
    }

    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });

  } catch (error) {
    console.error('Error during password recovery:', error);
    return NextResponse.json({ error: 'Erro interno ao recuperar senha.' }, { status: 500 });
  }
}
