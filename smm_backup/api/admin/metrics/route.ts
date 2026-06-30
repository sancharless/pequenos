import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';

export async function GET() {
  try {
    const [payments, orders, users, markupStr] = await Promise.all([
      dbHelper.getPayments(),
      dbHelper.getOrders(),
      dbHelper.getAllUsers(),
      dbHelper.getSetting('service_markup_percent', '20')
    ]);

    const markup = parseFloat(markupStr) || 20;

    // Filter approved payments
    const approvedPayments = payments.filter(p => p.status === 'approved');

    // 1. Calculate Billing metrics
    const totalBilling = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let dailyBilling = 0;
    let weeklyBilling = 0;
    let monthlyBilling = 0;

    for (const p of approvedPayments) {
      const pDate = new Date(p.createdAt);
      if (pDate >= startOfToday) {
        dailyBilling += p.amount;
      }
      if (pDate >= sevenDaysAgo) {
        weeklyBilling += p.amount;
      }
      if (pDate >= thirtyDaysAgo) {
        monthlyBilling += p.amount;
      }
    }

    // 2. Calculate Estimated Profit
    // Profit = charge * (markup / (100 + markup))
    // We only count orders that are not Canceled
    const activeOrders = orders.filter(o => o.status !== 'Cancelado');
    const estimatedProfit = activeOrders.reduce((sum, o) => {
      const profitRatio = markup / (100 + markup);
      return sum + (o.charge * profitRatio);
    }, 0);

    return NextResponse.json({
      totalBilling,
      dailyBilling,
      weeklyBilling,
      monthlyBilling,
      estimatedProfit,
      totalOrders: orders.length,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('Error generating admin metrics:', error);
    return NextResponse.json({ error: 'Erro ao gerar métricas do painel.' }, { status: 500 });
  }
}
