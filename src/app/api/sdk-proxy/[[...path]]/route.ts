import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.OLI_API_BASE ?? 'https://api.openlabelsinitiative.org';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const buildTargetUrl = (segments: string[] = [], searchParams?: URLSearchParams): string => {
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
  const path = segments.filter(Boolean).join('/');
  const url = new URL(path, normalizedBase);
  if (searchParams) {
    for (const [key, value] of searchParams.entries()) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.append(key, value);
    }
  }
  return url.toString();
};

const resolveApiKey = (request: NextRequest): string | null => {
  return (
    request.headers.get('x-api-key') ??
    process.env.OLI_API_KEY ??
    process.env.NEXT_PUBLIC_OLI_API_KEY ??
    null
  );
};

const buildForwardHeaders = (request: NextRequest, apiKey: string | null): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: request.headers.get('accept') ?? 'application/json'
  };

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  return headers;
};

const createResponseHeaders = (response: Response): Headers => {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
};

const proxyRequest = async (
  request: NextRequest,
  context: { params: { path?: string[] } }
): Promise<NextResponse> => {
  const segments = context.params.path ?? [];
  const targetUrl = buildTargetUrl(segments, request.nextUrl.searchParams);
  const apiKey = resolveApiKey(request);
  const headers = buildForwardHeaders(request, apiKey);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined
    });

    const responseHeaders = createResponseHeaders(upstream);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('SDK proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reach the OLI API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
    }
  });
}
