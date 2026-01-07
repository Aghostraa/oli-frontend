import { NextRequest, NextResponse } from 'next/server';
import { getOLIClient } from '@/lib/oli-client';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const address = url.searchParams.get('address') ?? undefined;
    const chainId = url.searchParams.get('chain_id') ?? undefined;
    const limit = Number(url.searchParams.get('limit')) || 100;
    const includeAllParam = url.searchParams.get('include_all') ?? url.searchParams.get('includeAll');
    const includeAll = includeAllParam === 'true';

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    const oli = await getOLIClient();

    const response = await oli.api.getLabels({
      address,
      chain_id: chainId ?? null,
      limit,
      include_all: includeAll
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch labels via OLI SDK', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
