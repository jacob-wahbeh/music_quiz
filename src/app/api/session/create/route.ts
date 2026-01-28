// POST /api/session/create - Create a new game session with generated deck

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { generateDeck } from '@/lib/deck';
import { generateMockDeck } from '@/lib/mockMusicProvider';
import { setSession } from '@/lib/redis';
import { GameSession, DeckItem } from '@/lib/types';

interface CreateSessionBody {
    host_name?: string;
    deck?: DeckItem[];
    mode?: 'mock' | 'host' | 'spotify';
}

export async function POST(request: NextRequest) {
    // Check if mock mode is enabled
    const isMockMode = process.env.VIBECHECK_MOCK_MODE === '1';

    // Try to parse body for host mode
    let body: CreateSessionBody = {};
    try {
        body = await request.json();
    } catch {
        // No body or invalid JSON - continue with defaults
    }

    // HOST MODE - custom deck from host's swipes
    if (body.mode === 'host' && body.deck) {
        const session: GameSession = {
            session_id: uuidv4(),
            host_id: 'host_user',
            host_name: body.host_name || 'Host',
            created_at: new Date().toISOString(),
            deck: body.deck,
        };

        await setSession(session.session_id, session);
        return NextResponse.json(session);
    }

    // MOCK MODE - auto-generated deck
    if (isMockMode || body.mode === 'mock') {
        const deck = generateMockDeck();
        const session: GameSession = {
            session_id: uuidv4(),
            host_id: 'mock_host',
            host_name: body.host_name || 'Demo Host',
            created_at: new Date().toISOString(),
            deck,
        };

        await setSession(session.session_id, session);
        return NextResponse.json(session);
    }

    // SPOTIFY MODE - use Spotify API
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    // Check for authentication
    if (!accessToken) {
        return NextResponse.json(
            { error: 'Unauthorized. Please log in with Spotify.' },
            { status: 401 }
        );
    }

    try {
        // Generate the deck from host's Spotify data
        const session = await generateDeck(accessToken);

        // Cache the session in Redis
        await setSession(session.session_id, session);

        // Return the session data
        return NextResponse.json(session);
    } catch (err) {
        console.error('Session creation failed:', err);

        // Check if it's an auth error from Spotify
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('401') || message.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Spotify token expired. Please log in again.' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create session. Please try again.' },
            { status: 500 }
        );
    }
}
