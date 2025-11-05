import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Resolve backend API base URL
 */
function resolveBaseUrl(): string {
  return (
    process.env.OLI_API_BASE_URL ??
    process.env.NEXT_PUBLIC_OLI_API_BASE_URL ??
    process.env.BACKEND_API_URL ??
    'https://api.openlabelsinitiative.org'
  );
}

/**
 * POST /api/developer/keys/:id/revoke
 * Revoke an API key
 * 
 * Forwards request to backend API /keys/{key_id}/revoke endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;

    // Verify user owns this API key (check session/cookie)
    const ownerId = request.cookies.get('github_user_id')?.value;
    
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect your GitHub account first.' },
        { status: 401 }
      );
    }

    // TODO: Optionally verify that the key belongs to this owner before revoking
    // This would require a GET /keys/{key_id} endpoint or checking the keys list first

    const backendApiUrl = resolveBaseUrl();
    
    // Forward request to backend API /keys/{key_id}/revoke endpoint
    const backendResponse = await fetch(`${backendApiUrl}/keys/${keyId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.API_ADMIN_BEARER_TOKEN && {
          'Authorization': `Bearer ${process.env.API_ADMIN_BEARER_TOKEN}`,
        }),
      },
    });

    if (!backendResponse.ok) {
      // Handle 422 validation errors
      if (backendResponse.status === 422) {
        const errorData = await backendResponse.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: errorData.detail?.[0]?.msg || errorData.error || 'Validation error',
            details: errorData.detail,
          },
          { status: 422 }
        );
      }
      
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || `Backend API error: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    // Backend may return empty response or confirmation
    const backendData = await backendResponse.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
      keyId, // Return keyId for confirmation
      ...backendData,
    });
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

