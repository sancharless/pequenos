import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { supplierClient } from '@/lib/supplier';

export async function POST(request: Request) {
  try {
    const { orderId, userEmail } = await request.json().catch(() => ({}));

    if (!orderId || !userEmail) {
      return NextResponse.json(
        { error: 'ID do pedido e e-mail são obrigatórios.' },
        { status: 400 }
      );
    }

    // Buscar detalhes do pedido
    const order = await dbHelper.getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      );
    }

    // Verificar propriedade do pedido
    if (order.userEmail?.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Você não tem permissão para solicitar refil para este pedido.' },
        { status: 403 }
      );
    }

    // Validar status do pedido
    if (order.status !== 'Concluido') {
      return NextResponse.json(
        { error: 'Apenas pedidos concluídos com sucesso podem receber reposição (refil).' },
        { status: 400 }
      );
    }

    // Verificar se o serviço é do fornecedor SMM (ID numérico do serviço)
    const isSupplierService = !isNaN(Number(order.serviceId));
    if (!isSupplierService) {
      return NextResponse.json(
        { error: 'Reposição não disponível para serviços customizados ou manuais.' },
        { status: 400 }
      );
    }

    // Enviar pedido de refil para o fornecedor
    console.log(`Solicitando Refil para pedido ${order.id} (Serviço ${order.serviceId}) do fornecedor...`);
    const supplierRes = await supplierClient.refillOrder(order.id);

    if (supplierRes.error) {
      // Mapear erros comuns do fornecedor para mensagens amigáveis em português
      let friendlyError = supplierRes.error;
      const rawError = supplierRes.error.toLowerCase();
      
      if (rawError.includes('not available') || rawError.includes('no refill')) {
        friendlyError = 'Reposição não disponível para este serviço ou já expirou.';
      } else if (rawError.includes('limit reached') || rawError.includes('already in progress')) {
        friendlyError = 'Uma solicitação de reposição já está em andamento ou o limite foi atingido.';
      } else if (rawError.includes('too old') || rawError.includes('expired')) {
        friendlyError = 'O período permitido para reposição deste pedido expirou.';
      }
      
      return NextResponse.json(
        { error: friendlyError },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitação de reposição enviada com sucesso para o fornecedor!',
      refillId: supplierRes.refill
    });

  } catch (error) {
    console.error('Error requesting refill:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar solicitação de reposição.' },
      { status: 500 }
    );
  }
}
