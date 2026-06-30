import React from 'react';
import { notFound } from 'next/navigation';
import { dbHelper } from '@/lib/db';
import ProductDetail from '@/components/ProductDetail';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const product = await dbHelper.getProductById(resolvedParams.id);
    
    if (!product) {
      return {
        title: 'Produto Não Encontrado | Pequenos Estilosos',
      };
    }

    return {
      title: `${product.name} | Pequenos Estilosos`,
      description: product.description,
      openGraph: {
        title: `${product.name} | Pequenos Estilosos`,
        description: `${product.description.substring(0, 150)}... - Apenas R$ ${product.price.toFixed(2).replace('.', ',')}`,
        images: [
          {
            url: product.images[0]?.startsWith('http') 
              ? product.images[0] 
              : 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop', // default fallback for open graph
            width: 600,
            height: 600,
            alt: product.name,
          },
        ],
      },
    };
  } catch (error) {
    return {
      title: 'Pequenos Estilosos',
    };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const product = await dbHelper.getProductById(resolvedParams.id);
  const settings = await dbHelper.getSettings();

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} settings={settings} />;
}
