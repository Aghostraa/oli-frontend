import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

function resolveApiKey(): string | undefined {
  return process.env.OLI_API_KEY ?? process.env.NEXT_PUBLIC_OLI_API_KEY;
}

function resolveBaseUrl(): string {
  return (
    process.env.OLI_API_BASE_URL ??
    process.env.NEXT_PUBLIC_OLI_API_BASE_URL ??
    'https://api.openlabelsinitiative.org'
  );
}

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Set OLI_API_KEY (or NEXT_PUBLIC_OLI_API_KEY) to enable leaderboard analytics.' },
        { status: 500 }
      );
    }

    const baseUrl = resolveBaseUrl();
    const url = request.nextUrl;

    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isNaN(limitParam)
      ? 20
      : Math.min(Math.max(limitParam, MIN_LIMIT), MAX_LIMIT);

    const orderParam = url.searchParams.get('order');
    const order_by = orderParam === 'attestations' ? 'attestations' : 'tags';

    const chainId = url.searchParams.get('chainId') ?? url.searchParams.get('chain_id') ?? undefined;

    const upstreamUrl = new URL('/analytics/attesters', baseUrl);
    upstreamUrl.searchParams.set('limit', String(limit));
    upstreamUrl.searchParams.set('order_by', order_by);
    if (chainId) {
      upstreamUrl.searchParams.set('chain_id', chainId);
    }

    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey
      },
      signal: controller.signal
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }

      return NextResponse.json(
        {
          error: `Upstream analytics request failed (${response.status})`,
          details: body
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Leaderboard request timed out' }, { status: 408 });
    }

    console.error('Failed to fetch attester analytics', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
