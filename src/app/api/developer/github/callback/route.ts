import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/developer/github/callback
 * Handles GitHub OAuth callback after user authorizes
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    // Note: state parameter validation can be added later for CSRF protection

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        `${url.origin}/developer?error=github_oauth_denied&message=${encodeURIComponent('GitHub authorization was cancelled')}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${url.origin}/developer?error=github_oauth_failed&message=${encodeURIComponent('Missing authorization code')}`
      );
    }

    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || 
      `${url.origin}/api/developer/github/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${url.origin}/developer?error=github_oauth_config&message=${encodeURIComponent('GitHub OAuth not configured')}`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    // Fetch user information from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userData = await userResponse.json();

    // TODO: Store the GitHub connection in database
    // Store:
    // - githubUsername (userData.login)
    // - githubUserId (userData.id)
    // - githubName (userData.name)
    // - githubAccessToken (encrypted)
    // - tokenExpiresAt (calculate from token response)
    // - scopes (from tokenData.scope)
    // This will be used for verification and future API calls
    
    // Set session cookie for GitHub connection
    const response = NextResponse.redirect(
      `${url.origin}/developer?github_connected=true&github_username=${encodeURIComponent(userData.login)}&github_name=${encodeURIComponent(userData.name || userData.login)}`
    );
    
    // Set secure session cookie
    response.cookies.set('github_username', userData.login, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Store GitHub user ID for owner_id in API key requests
    response.cookies.set('github_user_id', String(userData.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/developer?error=github_oauth_error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}

