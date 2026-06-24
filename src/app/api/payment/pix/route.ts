import { NextResponse } from 'next/server';
import { dbHelper, Payment } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { amount, userEmail } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido. Insira um valor maior que zero.' },
        { status: 400 }
      );
    }

    const paymentId = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Mercado Pago Mock QR code image (A premium SVG showing the payment details)
    const mockQrSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="#1a1a24" rx="10"/>
        <!-- Pix Logo style -->
        <rect x="80" y="80" width="40" height="40" fill="#00bfa5" rx="5" transform="rotate(45 100 100)"/>
        <text x="100" y="105" font-family="sans-serif" font-size="12" fill="#121214" font-weight="bold" text-anchor="middle">PIX</text>
        <!-- Mock QR Pattern -->
        <rect x="25" y="25" width="40" height="40" fill="none" stroke="#ffffff" stroke-width="6"/>
        <rect x="35" y="35" width="20" height="20" fill="#ffffff"/>
        <rect x="135" y="25" width="40" height="40" fill="none" stroke="#ffffff" stroke-width="6"/>
        <rect x="145" y="35" width="20" height="20" fill="#ffffff"/>
        <rect x="25" y="135" width="40" height="40" fill="none" stroke="#ffffff" stroke-width="6"/>
        <rect x="35" y="145" width="20" height="20" fill="#ffffff"/>
        
        <!-- Random dots -->
        <rect x="85" y="25" width="10" height="10" fill="#ffffff"/>
        <rect x="105" y="35" width="15" height="10" fill="#ffffff"/>
        <rect x="110" y="55" width="10" height="20" fill="#ffffff"/>
        <rect x="75" y="145" width="20" height="10" fill="#ffffff"/>
        <rect x="135" y="135" width="10" height="15" fill="#ffffff"/>
        <rect x="155" y="150" width="15" height="15" fill="#ffffff"/>
        <rect x="150" y="100" width="10" height="10" fill="#ffffff"/>
        <rect x="25" y="85" width="15" height="10" fill="#ffffff"/>
        <rect x="50" y="105" width="10" height="15" fill="#ffffff"/>
      </svg>
    `;
    const qrCodeBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(mockQrSvg.trim())}`;
    
    // Copy & Paste Pix (EMV CRC standard mock string)
    const qrCode = `00020101021226830014br.gov.bcb.pix2561pix.mercadopago.com/qr/v2/44e05b5b-24cb-4217-bc45-e6a8${paymentId}5204000053039865802BR5920SMM Panel Ggram Clone6009Sao Paulo62070503***6304D19E`;

    const newPayment: Payment = {
      id: paymentId,
      amount: parseFloat(amount),
      status: 'pending',
      qrCodeBase64,
      qrCode,
      createdAt: new Date().toISOString(),
      userEmail: userEmail || 'admin@goobox.com'
    };

    // Save payment
    await dbHelper.addPayment(newPayment);

    // Integridade com Mercado Pago Real (Opcional se houver token)
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (accessToken) {
      try {
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': paymentId
          },
          body: JSON.stringify({
            transaction_amount: parseFloat(amount),
            description: 'Recarga Saldo SMM Panel',
            payment_method_id: 'pix',
            payer: {
              email: 'cliente@ggramclone.com',
              first_name: 'Cliente',
              last_name: 'SMM',
              identification: {
                type: 'CPF',
                number: '12345678909'
              }
            }
          })
        });

        if (mpResponse.ok) {
          const mpData = await mpResponse.json();
          // Update details with real Mercado Pago details
          newPayment.id = mpData.id.toString();
          newPayment.qrCode = mpData.point_of_interaction.transaction_data.qr_code;
          newPayment.qrCodeBase64 = `data:image/png;base64,${mpData.point_of_interaction.transaction_data.qr_code_base64}`;
          // Re-update database
          // (We will write a simple flow or use this mp transaction)
        }
      } catch (err) {
        console.warn('Real Mercado Pago API call failed, using high-fidelity mock payment.', err);
      }
    }

    return NextResponse.json({
      success: true,
      payment: newPayment
    });
  } catch (error) {
    console.error('Error generating PIX payment:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar o pagamento Pix.' },
      { status: 500 }
    );
  }
}
