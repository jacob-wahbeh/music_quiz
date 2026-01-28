// GET /api/demo - Create a demo session with mock data

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GameSession } from '@/lib/types';
import { setSession } from '@/lib/redis';
import { generateMockDeck, getTopGenre } from '@/lib/mockMusicProvider';

export async function GET() {
    // Generate the deck using mock provider
    const deck = generateMockDeck();
    const topGenre = getTopGenre();

    // Create session
    const session: GameSession = {
        session_id: uuidv4(),
        host_id: 'demo_user',
        host_name: `Demo Host (${topGenre} lover)`,
        created_at: new Date().toISOString(),
        deck,
    };

    // Cache the session
    await setSession(session.session_id, session);

    // Redirect to the play page
    return NextResponse.redirect(
        new URL(`/play/${session.session_id}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
}
