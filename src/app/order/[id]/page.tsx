import React from 'react';
import { notFound } from 'next/navigation';
import { dbHelper } from '@/lib/db';
import OrderConfirmation from '@/components/OrderConfirmation';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  return {
    title: `Pedido ${resolvedParams.id} | Pequenos Estilosos`,
    description: 'Acompanhe o status do seu pedido no e-commerce Pequenos Estilosos.',
  };
}

export default async function OrderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const order = await dbHelper.getOrderById(resolvedParams.id);
  const settings = await dbHelper.getSettings();

  if (!order) {
    notFound();
  }

  return <OrderConfirmation initialOrder={order} settings={settings} />;
}
