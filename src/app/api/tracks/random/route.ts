// API route to get random tracks for host mode

import { NextRequest, NextResponse } from 'next/server';
import { DeckItem } from '@/lib/types';
import mockTracksData from '../../../../../data/mockTracks.json';

interface MockTrack {
    id: string;
    name: string;
    artist: string;
    genre: string;
    popularity: number;
    energy: string;
    preview_url: string;
    image_url: string;
}

const mockTracks: MockTrack[] = mockTracksData as MockTrack[];

function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '20', 10);

    // Shuffle and take requested count
    const shuffled = shuffle(mockTracks).slice(0, Math.min(count, mockTracks.length));

    // Convert to DeckItem format (without correct_swipe - host will set that)
    const tracks: DeckItem[] = shuffled.map(track => ({
        track_id: track.id,
        name: track.name,
        artist: track.artist,
        image_url: track.image_url,
        audio_url: track.preview_url,
        bucket_type: 'CULTURE',
        correct_swipe: 'RIGHT', // Placeholder - will be set by host
        host_has_saved: null,
    }));

    return NextResponse.json(tracks);
}
