import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { supplierClient } from '@/lib/supplier';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || undefined;
    const orders = await dbHelper.getOrders(email);

    // Filter active orders to sync (Pendente or Processando)
    const activeOrders = orders.filter(o => o.status === 'Pendente' || o.status === 'Processando');

    if (activeOrders.length > 0) {
      const orderIds = activeOrders.map(o => o.id);
      try {
        const statuses = await supplierClient.getOrderStatuses(orderIds);
        
        // Update database and in-memory list for changed statuses
        for (const order of activeOrders) {
          const supplierInfo = statuses[order.id];
          if (supplierInfo && supplierInfo.status) {
            let mappedStatus: 'Pendente' | 'Processando' | 'Concluido' | 'Cancelado' | 'Parcial' = order.status;
            
            const rawStatus = supplierInfo.status.toLowerCase();
            if (rawStatus === 'pending') {
              mappedStatus = 'Pendente';
            } else if (rawStatus === 'processing' || rawStatus === 'in progress') {
              mappedStatus = 'Processando';
            } else if (rawStatus === 'completed') {
              mappedStatus = 'Concluido';
            } else if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
              mappedStatus = 'Cancelado';
            } else if (rawStatus === 'partial') {
              mappedStatus = 'Parcial';
            }

            if (mappedStatus !== order.status) {
              await dbHelper.updateOrderStatus(order.id, mappedStatus);
              order.status = mappedStatus; // update in memory for the response
            }
          }
        }
      } catch (syncErr) {
        console.error('Error syncing order statuses with SMM supplier:', syncErr);
      }
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Erro ao carregar pedidos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { serviceId, link, quantity, userEmail } = await request.json();

    if (!serviceId || !link || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos ou incompletos.' },
        { status: 400 }
      );
    }

    // Get services from our database to validate
    const dbServices = await dbHelper.getServices();
    const service = dbServices.find(s => s.id === serviceId);
    
    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado na base de dados.' },
        { status: 404 }
      );
    }

    if (quantity < service.min || quantity > service.max) {
      return NextResponse.json(
        { error: `Quantidade inválida. Deve ser entre ${service.min} e ${service.max} unidades.` },
        { status: 400 }
      );
    }

    // Since the rate in the database is the selling rate (calculated with markup or custom price),
    // we use it directly.
    const charge = (service.ratePer1000 / 1000) * quantity;
    const user = await dbHelper.getUser(userEmail || undefined);

    if (user.balance < charge) {
      return NextResponse.json(
        { error: 'Saldo insuficiente no painel. Recarregue via Pix.' },
        { status: 400 }
      );
    }

    let supplierOrderId: number | undefined = undefined;

    // Check if the service is a real supplier service (its ID is numeric)
    const isSupplierService = !isNaN(Number(serviceId));

    if (isSupplierService) {
      // Place actual order with the SMM Supplier
      console.log(`Enviando pedido real para o fornecedor: Servico: ${serviceId}, Qtd: ${quantity}, Link: ${link}`);
      const supplierRes = await supplierClient.placeOrder(serviceId, link, quantity);

      if (supplierRes.error) {
        return NextResponse.json(
          { error: `Erro retornado pelo fornecedor: ${supplierRes.error}` },
          { status: 400 }
        );
      }

      if (supplierRes.order) {
        supplierOrderId = supplierRes.order;
      }
    } else {
      console.log(`Pedido de serviço customizado pulará API do fornecedor: Servico: ${serviceId}`);
      // Simula ID de pedido do fornecedor aleatório
      supplierOrderId = Math.floor(100000 + Math.random() * 900000);
    }

    // Deduct user balance in central db
    await dbHelper.updateUserBalance(user.email, -charge);

    // Save order in local database
    const newOrder = await dbHelper.addOrder({
      id: supplierOrderId?.toString(),
      serviceId,
      serviceName: service.name,
      link,
      quantity,
      charge,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      message: 'Pedido enviado com sucesso para o fornecedor!',
      order: newOrder,
      supplierOrderId: supplierOrderId,
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
