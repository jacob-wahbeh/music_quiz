// GET /api/auth/login - Initiate Spotify OAuth with PKCE

import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/pkce';
import { cookies } from 'next/headers';

// Required Spotify scopes for the app
const SCOPES = ['user-top-read', 'user-library-read'];

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: 'Missing Spotify configuration' },
            { status: 500 }
        );
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store code verifier in HTTP-only cookie for use in callback
    const cookieStore = await cookies();

    cookieStore.set('spotify_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes - should be enough time to complete auth
        path: '/',
    });

    cookieStore.set('spotify_auth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
    });

    // Build Spotify authorization URL
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state: state,
        scope: SCOPES.join(' '),
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    // Redirect to Spotify
    return NextResponse.redirect(authUrl);
}
