import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url } = request;
    const urlObj = new URL(url);
    
    // Mercado Pago pode enviar ID via query params ou body
    let paymentId = urlObj.searchParams.get('id') || urlObj.searchParams.get('data.id');
    
    if (body && body.data && body.data.id) {
      paymentId = body.data.id.toString();
    } else if (body && body.id) {
      paymentId = body.id.toString();
    }

    // Suporte para simulação direta do painel frontend
    const isSimulation = body.simulate === true;

    if (!paymentId) {
      return NextResponse.json({ error: 'Nenhum ID de pagamento fornecido' }, { status: 400 });
    }

    console.log(`Recebido Webhook de Pagamento. ID: ${paymentId}. Simulação: ${isSimulation}`);

    let shouldApprove = false;
    let paymentAmount = 0;

    const payments = await dbHelper.getPayments();
    const localPayment = payments.find(p => p.id === paymentId);

    if (isSimulation) {
      // Simulação direta para testes
      shouldApprove = true;
    } else {
      // Integração real com Mercado Pago se tiver Token
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (accessToken) {
        try {
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            if (mpData.status === 'approved') {
              shouldApprove = true;
              paymentAmount = mpData.transaction_amount;
            }
          }
        } catch (err) {
          console.error('Erro ao consultar Mercado Pago no Webhook', err);
        }
      } else {
        // Sem token configurado, tratamos webhook como aprovado de forma simulada para demonstração
        shouldApprove = true;
      }
    }

    if (shouldApprove) {
      const updated = await dbHelper.updatePaymentStatus(paymentId, 'approved');
      if (updated) {
        console.log(`Pagamento ${paymentId} APROVADO. Saldo atualizado com sucesso!`);
        
        // Apply coupon bonus if associated with this payment
        const email = updated.userEmail || 'admin@goobox.com';
        try {
          const paymentCoupon = await dbHelper.getPaymentCoupon(paymentId);
          if (paymentCoupon) {
            console.log(`Bônus de cupom encontrado para pagamento ${paymentId}: Código: ${paymentCoupon.couponCode}, Valor: R$ ${paymentCoupon.bonusAmount}`);
            await dbHelper.updateUserBalance(email, paymentCoupon.bonusAmount);
            await dbHelper.registerCouponUse(paymentCoupon.couponCode, email);
          }
        } catch (couponErr) {
          console.error('Error applying coupon bonus on payment approval:', couponErr);
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Pagamento processado e saldo creditado.', 
          payment: updated 
        });
      } else {
        // Já estava aprovado ou não encontrado
        if (localPayment && localPayment.status === 'approved') {
          return NextResponse.json({ success: true, message: 'Pagamento já processado anteriormente.' });
        }
        return NextResponse.json({ error: 'Pagamento não encontrado no banco local.' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, message: 'Evento recebido, mas pagamento pendente.' });
  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

// Suporte para GET (alguns webhooks de teste do MP usam GET)
export async function GET(request: Request) {
  const { url } = request;
  const urlObj = new URL(url);
  const paymentId = urlObj.searchParams.get('id');
  
  if (paymentId) {
    console.log(`Recebido ping GET para pagamento ${paymentId}`);
    return NextResponse.json({ success: true, received: true });
  }
  return NextResponse.json({ status: 'Webhook ativado' });
}
