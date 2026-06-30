import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { name, description, price, category, sizes, images, stock, featured } = body;

    const existing = await dbHelper.getProductById(resolvedParams.id);
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    const updated = await dbHelper.updateProduct(resolvedParams.id, {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(category ? { category } : {}),
      ...(sizes ? { sizes } : {}),
      ...(images ? { images } : {}),
      ...(stock !== undefined ? { stock: Number(stock) } : {}),
      ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const deleted = await dbHelper.deleteProduct(resolvedParams.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Produto não encontrado ou erro ao deletar.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
