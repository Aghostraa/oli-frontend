import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/proxy-test
 * Proxy endpoint for testing OLI API endpoints
 * This avoids CORS issues by forwarding requests server-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, path, params, headers: clientHeaders, body: requestBody } = body;

    if (!method || !path) {
      return NextResponse.json(
        { error: 'Method and path are required' },
        { status: 400 }
      );
    }

    // Build the URL
    const url = new URL(`https://api.openlabelsinitiative.org${path}`);
    
    // Add query parameters
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward API key if provided
    if (clientHeaders?.['x-api-key']) {
      headers['x-api-key'] = clientHeaders['x-api-key'];
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add request body for non-GET requests
    if (requestBody && method !== 'GET') {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const startTime = Date.now();
    const response = await fetch(url.toString(), fetchOptions);
    const responseTime = Date.now() - startTime;
    
    // Try to parse JSON response
    let responseData: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    // Return response with CORS headers
    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      },
      {
        status: response.ok ? 200 : response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


