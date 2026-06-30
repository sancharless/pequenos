import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Safely handle params if it is a Promise or a direct object
    const resolvedParams = 'then' in params ? await params : params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID do relatório ausente.' }, { status: 400 });
    }

    const report = await dbHelper.getMetaReport(id);
    if (!report) {
      return NextResponse.json({ error: 'Relatório não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Erro ao carregar o relatório.' }, { status: 500 });
  }
}
