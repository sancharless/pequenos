import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { whatsappNumber, instagramUrl, mercadoPagoToken, shippingFee } = body;

    const updated = await dbHelper.updateSettings({
      ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
      ...(instagramUrl !== undefined ? { instagramUrl } : {}),
      ...(mercadoPagoToken !== undefined ? { mercadoPagoToken } : {}),
      ...(shippingFee !== undefined ? { shippingFee: Number(shippingFee) } : {}),
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
