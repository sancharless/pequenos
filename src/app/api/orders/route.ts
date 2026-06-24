import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { supplierClient } from '@/lib/supplier';

export async function GET() {
  const orders = dbHelper.getOrders();
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const { serviceId, link, quantity } = await request.json();

    if (!serviceId || !link || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos ou incompletos.' },
        { status: 400 }
      );
    }

    // Get live services from supplier to validate constraints
    const liveServices = await supplierClient.getServices();
    const service = liveServices.find(s => s.service.toString() === serviceId);
    
    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado na API do fornecedor.' },
        { status: 404 }
      );
    }

    if (quantity < service.min || quantity > service.max) {
      return NextResponse.json(
        { error: `Quantidade inválida. Deve ser entre ${service.min} e ${service.max} unidades.` },
        { status: 400 }
      );
    }

    const rate = parseFloat(service.rate);
    const charge = (rate / 1000) * quantity;
    const user = dbHelper.getUser();

    // Verificação de saldo simulado do usuário (ou da sessão)
    // O front-end gerencia a redução local do saldo do usuário logado na sessão também.
    // Mas validamos no servidor pelo banco de dados central
    if (user.balance < charge) {
      return NextResponse.json(
        { error: 'Saldo insuficiente no painel. Recarregue via Pix.' },
        { status: 400 }
      );
    }

    // Place actual order with the SMM Supplier
    console.log(`Enviando pedido real para o fornecedor: Servico: ${serviceId}, Qtd: ${quantity}, Link: ${link}`);
    const supplierRes = await supplierClient.placeOrder(serviceId, link, quantity);

    if (supplierRes.error) {
      return NextResponse.json(
        { error: `Erro retornado pelo fornecedor: ${supplierRes.error}` },
        { status: 400 }
      );
    }

    // Deduct user balance in central db
    dbHelper.updateUserBalance(-charge);

    // Save order in local database
    const newOrder = dbHelper.addOrder({
      serviceId,
      serviceName: service.name,
      link,
      quantity,
      charge
    });

    // Subtitui ID local pelo ID do fornecedor se retornado
    if (supplierRes.order) {
      newOrder.id = supplierRes.order.toString();
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido enviado com sucesso para o fornecedor!',
      order: newOrder,
      supplierOrderId: supplierRes.order,
      newBalance: user.balance - charge
    });
  } catch (error) {
    console.error('Error placing SMM order:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao processar seu pedido na API.' },
      { status: 500 }
    );
  }
}
