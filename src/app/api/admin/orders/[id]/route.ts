import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { paymentStatus } = body;

    if (!paymentStatus) {
      return NextResponse.json({ error: 'Status do pagamento é obrigatório.' }, { status: 400 });
    }

    const updated = await dbHelper.updateOrderStatus(resolvedParams.id, paymentStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
