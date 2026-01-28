// Mock Music Provider - Provides track data for demo mode without Spotify

import { DeckItem, BucketType } from './types';
import mockTracksData from '../../data/mockTracks.json';

export interface MockTrack {
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

// Genre mapping for "icks" - opposite genres
const ICK_GENRE_MAP: Record<string, string> = {
    'pop': 'metal',
    'hip-hop': 'country',
    'rock': 'classical',
    'indie': 'metal',
    'electronic': 'country',
    'country': 'electronic',
    'metal': 'pop',
    'classical': 'electronic',
    'jazz': 'metal',
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Convert MockTrack to DeckItem
 */
function toDeckItem(
    track: MockTrack,
    bucketType: BucketType,
    correctSwipe: 'LEFT' | 'RIGHT',
    hostHasSaved: boolean | null = null
): DeckItem {
    return {
        track_id: track.id,
        name: track.name,
        artist: track.artist,
        image_url: track.image_url,
        audio_url: track.preview_url,
        bucket_type: bucketType,
        correct_swipe: correctSwipe,
        host_has_saved: hostHasSaved,
    };
}

/**
 * Get host's top genre (simulated - picks most popular genre)
 */
export function getTopGenre(): string {
    const genres = ['pop', 'hip-hop', 'rock', 'indie', 'electronic'];
    return genres[Math.floor(Math.random() * genres.length)];
}

/**
 * Get Anthems - host's top tracks (highest popularity in their genre)
 */
export function getAnthems(topGenre: string, count: number = 5): DeckItem[] {
    const genreTracks = mockTracks
        .filter(t => t.genre === topGenre)
        .sort((a, b) => b.popularity - a.popularity);

    return genreTracks
        .slice(0, count)
        .map(t => toDeckItem(t, 'ANTHEM', 'RIGHT'));
}

/**
 * Get Traps - similar genre, high popularity, but not the anthems
 */
export function getTraps(topGenre: string, excludeIds: Set<string>, count: number = 5): DeckItem[] {
    const genreTracks = mockTracks
        .filter(t => t.genre === topGenre && !excludeIds.has(t.id))
        .sort((a, b) => b.popularity - a.popularity);

    return genreTracks
        .slice(0, count)
        .map(t => toDeckItem(t, 'TRAP', 'LEFT'));
}

/**
 * Get Icks - contrasting genre (deterministic mapping)
 */
export function getIcks(topGenre: string, count: number = 5): DeckItem[] {
    const ickGenre = ICK_GENRE_MAP[topGenre] || 'country';

    const ickTracks = mockTracks
        .filter(t => t.genre === ickGenre)
        .sort((a, b) => b.popularity - a.popularity);

    return shuffle(ickTracks)
        .slice(0, count)
        .map(t => toDeckItem(t, 'ICK', 'LEFT'));
}

/**
 * Get Culture - globally popular tracks across genres
 */
export function getCulture(count: number = 5): DeckItem[] {
    const topTracks = [...mockTracks]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20);

    const selected = shuffle(topTracks).slice(0, count);

    // Randomly mark some as "saved" by host
    return selected.map((t, i) => {
        const hostHasSaved = i % 2 === 0; // 50% saved
        return toDeckItem(t, 'CULTURE', hostHasSaved ? 'RIGHT' : 'LEFT', hostHasSaved);
    });
}

/**
 * Generate a complete mock deck (20 tracks)
 */
export function generateMockDeck(): DeckItem[] {
    const topGenre = getTopGenre();

    // Get anthems first
    const anthems = getAnthems(topGenre, 5);
    const anthemIds = new Set(anthems.map(a => a.track_id));

    // Get traps (exclude anthems)
    const traps = getTraps(topGenre, anthemIds, 5);

    // Get icks
    const icks = getIcks(topGenre, 5);

    // Get culture
    const culture = getCulture(5);

    // Combine and shuffle
    const deck = [...anthems, ...traps, ...icks, ...culture];
    return shuffle(deck);
}

/**
 * Get all available genres
 */
export function getAvailableGenres(): string[] {
    const genres = new Set(mockTracks.map(t => t.genre));
    return Array.from(genres);
}

/**
 * Get tracks by genre
 */
export function getTracksByGenre(genre: string): MockTrack[] {
    return mockTracks.filter(t => t.genre === genre);
}

/**
 * Get all mock tracks
 */
export function getAllTracks(): MockTrack[] {
    return mockTracks;
}
