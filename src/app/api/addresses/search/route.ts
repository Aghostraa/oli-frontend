import { NextRequest, NextResponse } from 'next/server';
import { getOLIClient } from '@/lib/oli-client';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const tagId = url.searchParams.get('tag_id') ?? undefined;
    const tagValue = url.searchParams.get('tag_value') ?? undefined;
    const chainId = url.searchParams.get('chain_id') ?? undefined;
    const limit = Number(url.searchParams.get('limit')) || 100;

    if (!tagId) {
      return NextResponse.json(
        { error: 'tag_id is required' },
        { status: 400 }
      );
    }

    const oli = await getOLIClient();

    const response = await oli.api.searchAddressesByTag({
      tag_id: tagId,
      tag_value: tagValue ?? undefined,
      chain_id: chainId ?? undefined,
      limit
    } as {
      tag_id: string;
      tag_value: string;
      chain_id?: string | null;
      limit?: number;
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to search addresses via OLI SDK', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
