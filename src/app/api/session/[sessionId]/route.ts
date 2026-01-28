// GET /api/session/[sessionId] - Retrieve a cached game session

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/redis';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;

    if (!sessionId) {
        return NextResponse.json(
            { error: 'Session ID is required' },
            { status: 400 }
        );
    }

    try {
        // Fetch from cache only - no Spotify API calls
        const session = await getSession(sessionId);

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found or expired' },
                { status: 404 }
            );
        }

        return NextResponse.json(session);
    } catch (err) {
        console.error('Session fetch failed:', err);
        return NextResponse.json(
            { error: 'Failed to fetch session' },
            { status: 500 }
        );
    }
}
