import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET() {
  try {
    let services = await dbHelper.getServices();

    // Auto-sync if database is empty or has only default fallback services
    if (services.length <= 2) {
      console.log('Services database is empty or has only default fallbacks. Auto-syncing from supplier...');
      const synced = await dbHelper.syncServicesFromSupplier();
      if (synced && synced.length > 0) {
        services = synced;
      }
    }

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Erro ao carregar serviços.' }, { status: 500 });
  }
}
