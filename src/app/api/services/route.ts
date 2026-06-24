import { NextResponse } from 'next/server';
import { supplierClient } from '@/lib/supplier';

export async function GET() {
  try {
    const rawServices = await supplierClient.getServices();
    
    // Mapeia os serviços retornados da API real para a estrutura do front-end
    const services = rawServices.map(srv => ({
      id: srv.service.toString(),
      name: `${srv.name} - R$ ${parseFloat(srv.rate).toFixed(2)} por 1000`,
      category: srv.category,
      ratePer1000: parseFloat(srv.rate),
      min: srv.min,
      max: srv.max,
      description: `Serviço de alta velocidade de tipo: ${srv.type}. Pedido mínimo de ${srv.min} e máximo de ${srv.max} unidades.`
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching live services:', error);
    return NextResponse.json({ error: 'Erro ao carregar serviços da API real.' }, { status: 500 });
  }
}
