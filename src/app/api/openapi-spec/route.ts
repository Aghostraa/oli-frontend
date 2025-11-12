import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/openapi-spec
 * Proxy endpoint to fetch OpenAPI specification from the OLI API
 * This avoids CORS issues by fetching server-side
 */
export async function GET() {
  try {
    const response = await fetch('https://api.openlabelsinitiative.org/openapi.json', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }

    const data = await response.json();

    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to fetch OpenAPI spec:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

