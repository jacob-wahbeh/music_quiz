// GET /api/auth/callback - Handle Spotify OAuth callback

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken } from '@/lib/spotify';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors from Spotify
    if (error) {
        console.error('Spotify auth error:', error);
        return NextResponse.redirect(
            new URL(`/?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL('/?error=missing_code_or_state', request.url)
        );
    }

    const cookieStore = await cookies();

    // Verify state to prevent CSRF
    const storedState = cookieStore.get('spotify_auth_state')?.value;
    if (state !== storedState) {
        return NextResponse.redirect(
            new URL('/?error=state_mismatch', request.url)
        );
    }

    // Get code verifier from cookie
    const codeVerifier = cookieStore.get('spotify_code_verifier')?.value;
    if (!codeVerifier) {
        return NextResponse.redirect(
            new URL('/?error=missing_code_verifier', request.url)
        );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.redirect(
            new URL('/?error=missing_config', request.url)
        );
    }

    try {
        // Exchange code for access token
        const tokenData = await exchangeCodeForToken(
            code,
            codeVerifier,
            redirectUri,
            clientId
        );

        // Create response with redirect to host page
        const response = NextResponse.redirect(new URL('/host', request.url));

        // Store access token in HTTP-only secure cookie
        response.cookies.set('spotify_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokenData.expires_in, // Token expiry time from Spotify
            path: '/',
        });

        // Store refresh token if provided (for future token refresh implementation)
        if (tokenData.refresh_token) {
            response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });
        }

        // Clean up PKCE cookies
        response.cookies.delete('spotify_code_verifier');
        response.cookies.delete('spotify_auth_state');

        return response;
    } catch (err) {
        console.error('Token exchange failed:', err);
        return NextResponse.redirect(
            new URL('/?error=token_exchange_failed', request.url)
        );
    }
}
