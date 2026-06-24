import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { supplierClient } from '@/lib/supplier';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    
    const authHeader = request.headers.get('authorization');
    const headerSecret = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
      
    const expectedSecret = process.env.CRON_SECRET;
    
    // Validate secret if configured
    if (expectedSecret) {
      if (querySecret !== expectedSecret && headerSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      }
    }

    const orders = await dbHelper.getOrders();
    
    // Filter active orders that belong to the supplier (numeric service IDs)
    const activeOrders = orders.filter(
      o => (o.status === 'Pendente' || o.status === 'Processando') && o.id && !isNaN(Number(o.serviceId))
    );

    if (activeOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum pedido ativo para sincronizar.',
        checkedCount: 0,
        updatedCount: 0,
        updates: []
      });
    }

    const orderIds = activeOrders.map(o => o.id);
    const updates: { id: string; oldStatus: string; newStatus: string }[] = [];

    // Query supplier for order statuses in batch
    const statuses = await supplierClient.getOrderStatuses(orderIds);

    for (const order of activeOrders) {
      const supplierInfo = statuses[order.id];
      if (supplierInfo && supplierInfo.status && !supplierInfo.error) {
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
          updates.push({
            id: order.id,
            oldStatus: order.status,
            newStatus: mappedStatus
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso.',
      checkedCount: activeOrders.length,
      updatedCount: updates.length,
      updates
    });

  } catch (error) {
    console.error('Error in cron sync-orders API:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar pedidos.' }, { status: 500 });
  }
}
