import React from 'react';
import { dbHelper } from '@/lib/db';
import StoreFront from '@/components/StoreFront';

// Opt out of caching so new products/settings added by the admin appear instantly
export const revalidate = 0;

export default async function HomePage() {
  // Fetch products and settings directly on the server
  const products = await dbHelper.getProducts();
  const settings = await dbHelper.getSettings();

  return <StoreFront products={products} settings={settings} />;
}
