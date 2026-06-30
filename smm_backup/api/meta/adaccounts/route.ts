import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso do Facebook ausente.' }, { status: 400 });
    }

    // Call Facebook Graph API to get ad accounts
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,id&limit=100&access_token=${accessToken}`,
      { cache: 'no-store' }
    );

    if (!fbRes.ok) {
      const errorData = await fbRes.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Erro ao consultar a API do Facebook.' },
        { status: fbRes.status }
      );
    }

    const adAccountsData = await fbRes.json();
    return NextResponse.json(adAccountsData.data || []);
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json({ error: 'Erro interno ao carregar contas de anúncio.' }, { status: 500 });
  }
}
