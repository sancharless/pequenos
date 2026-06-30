import { NextResponse } from 'next/server';
import { dbHelper, MetaReport } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const reportData: MetaReport = await request.json();
    if (!reportData.id || !reportData.name) {
      return NextResponse.json({ error: 'Dados inválidos. ID e Nome do relatório são obrigatórios.' }, { status: 400 });
    }
    
    const saved = await dbHelper.saveMetaReport(reportData);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json({ error: 'Erro ao salvar relatório no banco de dados.' }, { status: 500 });
  }
}
