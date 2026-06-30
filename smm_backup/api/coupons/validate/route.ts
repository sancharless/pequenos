import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, email, depositAmount } = await request.json().catch(() => ({}));

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

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Este cupom atingiu o limite de usos.' }, { status: 400 });
    }

    // Check if user already used this coupon
    const alreadyUsed = await dbHelper.checkCouponUse(code, email);
    if (alreadyUsed) {
      return NextResponse.json({ error: 'Você já utilizou este cupom.' }, { status: 400 });
    }

    // Check deposit constraints if depositAmount is provided
    if (depositAmount !== undefined) {
      const amount = parseFloat(depositAmount);
      if (amount < coupon.minDeposit) {
        return NextResponse.json({
          error: `Este cupom exige um depósito mínimo de R$ ${coupon.minDeposit.toFixed(2)}.`
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cupom válido!',
      coupon
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ error: 'Erro ao validar cupom.' }, { status: 500 });
  }
}
