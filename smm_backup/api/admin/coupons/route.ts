import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET() {
  try {
    const coupons = await dbHelper.getCoupons();
    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Error fetching admin coupons:', error);
    return NextResponse.json({ error: 'Erro ao carregar cupons.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create') {
      const { code, type, value, minDeposit, maxUses } = body;

      if (!code || !type || value === undefined || minDeposit === undefined) {
        return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
      }

      // Check if coupon already exists
      const existing = await dbHelper.getCouponByCode(code);
      if (existing) {
        return NextResponse.json({ error: 'Já existe um cupom com este código.' }, { status: 400 });
      }

      const newCoupon = await dbHelper.createCoupon({
        code: code.toUpperCase(),
        type,
        value: parseFloat(value) || 0,
        minDeposit: parseFloat(minDeposit) || 0,
        maxUses: maxUses ? parseInt(maxUses) : null,
        usedCount: 0,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        message: `Cupom ${newCoupon.code} criado com sucesso!`,
        coupon: newCoupon
      });

    } else if (action === 'delete') {
      const { code } = body;

      if (!code) {
        return NextResponse.json({ error: 'O código do cupom é obrigatório.' }, { status: 400 });
      }

      const success = await dbHelper.deleteCoupon(code);
      if (!success) {
        return NextResponse.json({ error: 'Cupom não encontrado ou falha ao excluir.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Cupom excluído com sucesso!'
      });

    } else {
      return NextResponse.json({ error: 'Ação administrativa inválida.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in admin coupons API:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 });
  }
}
