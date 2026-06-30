import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export const revalidate = 0;

export async function GET() {
  try {
    const products = await dbHelper.getProducts();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, price, category, sizes, images, stock, featured } = body;

    if (!name || price === undefined || !category || !sizes || !sizes.length) {
      return NextResponse.json(
        { error: 'Nome, preço, categoria e tamanhos são obrigatórios.' },
        { status: 400 }
      );
    }

    const newProduct = await dbHelper.createProduct({
      name,
      description: description || '',
      price: Number(price),
      category,
      sizes,
      images: images || [],
      stock: Number(stock !== undefined ? stock : 0),
      featured: Boolean(featured)
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
