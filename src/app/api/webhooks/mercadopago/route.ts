import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Mercado Pago Webhook received:', body);

    const type = body.type || body.topic;
    const paymentId = body.data?.id || body.resource?.split('/').pop();

    if (type === 'payment' && paymentId) {
      // Find order associated with this payment ID in our database
      const orders = await dbHelper.getOrders();
      const order = orders.find(o => o.paymentId === String(paymentId));

      if (order) {
        // Fetch settings for MP access token
        const settings = await dbHelper.getSettings();
        const mpToken = settings.mercadoPagoToken?.trim();

        if (mpToken && mpToken.startsWith('APP_USR-')) {
          // Query Mercado Pago for current payment status
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${mpToken}`
            }
          });

          if (mpResponse.ok) {
            const paymentData = await mpResponse.json();
            const mpStatus = paymentData.status; // 'approved', 'pending', 'rejected', 'cancelled'

            let finalStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' = 'pending';
            if (mpStatus === 'approved') finalStatus = 'approved';
            if (mpStatus === 'rejected') finalStatus = 'rejected';
            if (mpStatus === 'cancelled') finalStatus = 'cancelled';

            await dbHelper.updateOrderStatus(order.id, finalStatus);
            console.log(`Order ${order.id} updated to status ${finalStatus} via webhook.`);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error in Mercado Pago webhook:', error);
    // Always return 200 to Mercado Pago to stop retries, even if we had an internal error
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}

// Support GET request just in case Mercado Pago performs a simple ping/validation
export async function GET() {
  return NextResponse.json({ status: 'active' });
}
