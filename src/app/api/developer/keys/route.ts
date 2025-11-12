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
 * POST /api/developer/keys
 * Request an API key for a verified developer
 * 
 * Forwards request to backend API /keys endpoint with CreateKeyRequest format
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubUsername, telegramHandle, organization, useCase } = body;

    // Get owner_id from session cookie (GitHub user ID)
    const ownerId = request.cookies.get('github_user_id')?.value;
    
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect your GitHub account first.' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!githubUsername || !telegramHandle || !organization || !useCase) {
      return NextResponse.json(
        { error: 'Missing required fields: githubUsername, telegramHandle, organization, and useCase are required' },
        { status: 400 }
      );
    }

    // Validate telegram handle format
    if (!telegramHandle.startsWith('@')) {
      return NextResponse.json(
        { error: 'Telegram handle must start with @' },
        { status: 400 }
      );
    }

    // Validate use case length
    if (useCase.trim().length < 20) {
      return NextResponse.json(
        { error: 'Use case description must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Prepare request body for backend API matching CreateKeyRequest schema
    const backendRequestBody = {
      owner_id: ownerId,
      metadata: {
        github_profile: githubUsername,
        telegram_handle: telegramHandle,
        organization: organization,
        what_for: useCase,
      },
    };

    const backendApiUrl = resolveBaseUrl();
    const adminToken = process.env.API_ADMIN_BEARER_TOKEN?.trim(); // Trim whitespace
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if admin token is configured
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    
    // Forward request to backend API /keys endpoint
    const backendResponse = await fetch(`${backendApiUrl}/keys`, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendRequestBody),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      
      // Handle 422 validation errors
      if (backendResponse.status === 422) {
        return NextResponse.json(
          { 
            error: errorData.detail?.[0]?.msg || errorData.error || 'Validation error',
            details: errorData.detail,
          },
          { status: 422 }
        );
      }
      
      // Handle 403 Forbidden - likely authentication issue
      if (backendResponse.status === 403) {
        return NextResponse.json(
          { 
            error: errorData.error || errorData.message || 'Access forbidden. Please check API authentication configuration.',
            details: adminToken 
              ? 'Authentication token provided but rejected by backend'
              : 'Authentication token missing',
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.error || errorData.message || `Backend API error: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    const backendData = await backendResponse.json();

    // Backend should return CreateKeyResponse format
    // Expected format: { api_key: "oli_...", id: "...", ... }
    const apiKey = backendData.api_key || backendData.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Backend API did not return an API key' },
        { status: 500 }
      );
    }

    // Return success response with API key
    const response = NextResponse.json({
      success: true,
      apiKey: {
        id: backendData.id || backendData.api_key_id || backendData.key_id || 'unknown',
        apiKey: apiKey,
        createdAt: backendData.created_at || backendData.createdAt || new Date().toISOString(),
        isActive: backendData.is_active !== false,
      },
      message: 'API key generated successfully',
    });

    // Keep session cookies for GitHub connection
    const githubUsernameFromCookie = request.cookies.get('github_username')?.value;
    if (githubUsernameFromCookie) {
      response.cookies.set('github_username', githubUsernameFromCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to generate API key:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}