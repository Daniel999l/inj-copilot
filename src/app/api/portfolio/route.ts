import { NextResponse } from 'next/server';
import { getPortfolio, isInjectiveAddress } from '@/lib/injective';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let address = '';
  try {
    const body = await req.json();
    address = (body?.address || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!isInjectiveAddress(address)) {
    return NextResponse.json(
      { error: 'Please provide a valid Injective address (starts with "inj1").' },
      { status: 400 },
    );
  }

  try {
    const portfolio = await getPortfolio(address);
    return NextResponse.json(portfolio);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to load portfolio: ${err?.message || 'unknown error'}` },
      { status: 502 },
    );
  }
}
