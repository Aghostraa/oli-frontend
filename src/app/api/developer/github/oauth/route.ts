import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/developer/github/oauth
 * Initiates GitHub OAuth flow
 * Redirects user to GitHub authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || 
      `${request.nextUrl.origin}/api/developer/github/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GitHub OAuth client ID not configured' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7)
    })).toString('base64');

    // GitHub OAuth authorization URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('state', state);
    githubAuthUrl.searchParams.set('scope', 'read:user user:email'); // Request minimal permissions

    // Redirect to GitHub
    return NextResponse.redirect(githubAuthUrl.toString());
  } catch (error) {
    console.error('Failed to initiate GitHub OAuth:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


