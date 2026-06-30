import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create') {
      const { id, name, category, ratePer1000, min, max, description } = body;

      if (!id || !name || !category || ratePer1000 === undefined || min === undefined || max === undefined) {
        return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
      }

      const newService = await dbHelper.adminCreateService({
        id,
        name,
        category,
        ratePer1000: parseFloat(ratePer1000) || 0,
        min: parseInt(min) || 0,
        max: parseInt(max) || 0,
        description: description || ''
      });

      return NextResponse.json({
        success: true,
        message: 'Serviço criado com sucesso!',
        service: newService
      });

    } else if (action === 'update') {
      const { id, name, category, ratePer1000, min, max, description } = body;

      if (!id) {
        return NextResponse.json({ error: 'O ID do serviço é obrigatório.' }, { status: 400 });
      }

      const updated = await dbHelper.adminUpdateService(id, {
        name,
        category,
        ratePer1000: ratePer1000 !== undefined ? parseFloat(ratePer1000) : undefined,
        min: min !== undefined ? parseInt(min) : undefined,
        max: max !== undefined ? parseInt(max) : undefined,
        description
      });

      if (!updated) {
        return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Serviço atualizado com sucesso!',
        service: updated
      });

    } else if (action === 'delete') {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: 'O ID do serviço é obrigatório.' }, { status: 400 });
      }

      const success = await dbHelper.adminDeleteService(id);
      if (!success) {
        return NextResponse.json({ error: 'Serviço não encontrado ou falha ao excluir.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Serviço excluído com sucesso!'
      });

    } else if (action === 'sync') {
      console.log('Admin triggered manual synchronization of services from SMM supplier...');
      const synced = await dbHelper.syncServicesFromSupplier();
      
      return NextResponse.json({
        success: true,
        message: `Sincronização concluída! ${synced.length} serviços atualizados/importados.`,
        count: synced.length
      });

    } else {
      return NextResponse.json({ error: 'Ação administrativa inválida.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in admin services API:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição administrativa.' }, { status: 500 });
  }
}
