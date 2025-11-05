import { NextRequest, NextResponse } from 'next/server';
import { getOLIClient } from '@/lib/oli-client';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const limit = Number(url.searchParams.get('limit')) || 50;
    const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const recipient = url.searchParams.get('recipient') ?? url.searchParams.get('address') ?? undefined;
    const attester = url.searchParams.get('attester') ?? undefined;
    const dataContains = url.searchParams.get('dataContains') ?? undefined;
    const chainId = url.searchParams.get('chainId') ?? undefined;

    const oli = await getOLIClient();

    const { attestations, count } = await oli.rest.getAttestationsExpanded({
      recipient: recipient ?? null,
      attester: attester ?? null,
      data_contains: dataContains ?? null,
      chain_id: chainId ?? null,
      limit,
      order
    });

    return NextResponse.json({ count, attestations });
  } catch (error) {
    console.error('Failed to fetch attestations via OLI SDK', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
