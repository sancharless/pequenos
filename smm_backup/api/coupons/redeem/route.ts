import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, email } = await request.json().catch(() => ({}));

    if (!code || !email) {
      return NextResponse.json({ error: 'Código e e-mail são obrigatórios.' }, { status: 400 });
    }

    const coupon = await dbHelper.getCouponByCode(code);

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom inválido ou não existe.' }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: 'Este cupom foi desativado.' }, { status: 400 });
    }

    // Check if it is a direct redemption coupon
    if (coupon.minDeposit > 0) {
      return NextResponse.json({
        error: `Este cupom só pode ser aplicado em recargas Pix acima de R$ ${coupon.minDeposit.toFixed(2)}.`
      }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Este cupom atingiu o limite de usos.' }, { status: 400 });
    }

    // Check if user already used this coupon
    const alreadyUsed = await dbHelper.checkCouponUse(code, email);
    if (alreadyUsed) {
      return NextResponse.json({ error: 'Você já resgatou este cupom.' }, { status: 400 });
    }

    // Get user to verify they exist
    const user = await dbHelper.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Apply direct bonus value to user balance
    const bonus = coupon.value;
    await dbHelper.updateUserBalance(email, bonus);

    // Register coupon use
    await dbHelper.registerCouponUse(code, email);

    return NextResponse.json({
      success: true,
      message: `Sucesso! R$ ${bonus.toFixed(2)} foram creditados na sua conta.`,
      bonusAmount: bonus,
      newBalance: user.balance + bonus
    });
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return NextResponse.json({ error: 'Erro ao resgatar cupom.' }, { status: 500 });
  }
}
