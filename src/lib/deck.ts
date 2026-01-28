// Deck generation algorithm implementing the exact bucket rules from instructions.md

import { v4 as uuidv4 } from 'uuid';
import {
    DeckItem,
    GameSession,
    BucketType,
    SpotifyTrack,
    SpotifyArtist,
} from './types';
import {
    getMe,
    getTopTracks,
    getTopArtists,
    getRecommendations,
    getPlaylistTracks,
    checkSavedTracks,
    GLOBAL_TOP_50_PLAYLIST_ID,
} from './spotify';

const TRACKS_PER_BUCKET = 5;
const TOTAL_DECK_SIZE = 20;

/**
 * Generate a complete 20-card deck from the host's Spotify data.
 * 4 buckets × 5 tracks each, shuffled.
 */
export async function generateDeck(token: string): Promise<GameSession> {
    // Get host identity
    const user = await getMe(token);

    // Generate all four buckets
    const [anthems, topGenre, topTrackIds] = await generateAnthems(token);
    const traps = await generateTraps(token, topGenre, topTrackIds);
    const icks = await generateIcks(token, topGenre);
    const culture = await generateCulture(token);

    // Combine and dedupe across all buckets
    let allItems = [...anthems, ...traps, ...icks, ...culture];
    allItems = dedupeByTrackId(allItems);

    // Verify we have enough tracks after deduplication
    // If not, this is a failure case - the individual bucket functions should have handled refilling
    if (allItems.length < TOTAL_DECK_SIZE) {
        console.warn(`Only got ${allItems.length} tracks after deduplication. Expected ${TOTAL_DECK_SIZE}`);
        // We'll proceed with what we have, but this shouldn't happen with proper refilling
    }

    // Shuffle the deck
    const deck = shuffle(allItems.slice(0, TOTAL_DECK_SIZE));

    return {
        session_id: uuidv4(),
        host_id: user.id,
        host_name: user.display_name || 'Unknown Host',
        created_at: new Date().toISOString(),
        deck,
    };
}

/**
 * Bucket A: The Anthems (5 tracks)
 * Host's top short-term tracks. Correct swipe = RIGHT
 */
async function generateAnthems(
    token: string
): Promise<[DeckItem[], string, Set<string>]> {
    // Fetch more than needed to account for missing preview_url
    let tracks = await getTopTracks(token, 'short_term', 20);

    // Filter for playable tracks
    tracks = filterPlayableTracks(tracks);

    // Get top genre while we have the data
    const topGenre = await getTopGenre(token);

    // Create deck items
    const anthems = tracks.slice(0, TRACKS_PER_BUCKET).map(track =>
        createDeckItem(track, 'ANTHEM', 'RIGHT', false)
    );

    // Track IDs for exclusion in other buckets
    const topTrackIds = new Set(tracks.map(t => t.id));

    // If we don't have enough, try medium_term as fallback
    if (anthems.length < TRACKS_PER_BUCKET) {
        const mediumTerm = await getTopTracks(token, 'medium_term', 20);
        const filteredMedium = filterPlayableTracks(mediumTerm)
            .filter(t => !topTrackIds.has(t.id));

        const needed = TRACKS_PER_BUCKET - anthems.length;
        for (const track of filteredMedium.slice(0, needed)) {
            anthems.push(createDeckItem(track, 'ANTHEM', 'RIGHT', false));
            topTrackIds.add(track.id);
        }
    }

    return [anthems, topGenre, topTrackIds];
}

/**
 * Bucket B: The Traps (5 tracks)
 * Songs that resemble host taste but not actually listened to.
 * Correct swipe = LEFT
 */
async function generateTraps(
    token: string,
    topGenre: string,
    excludeTrackIds: Set<string>
): Promise<DeckItem[]> {
    // Get recommendations seeded by top genre with high popularity
    let tracks = await getRecommendations(token, {
        seedGenres: [topGenre],
        limit: 100,
        targetPopularity: 80,
    });

    // Filter for playable tracks and exclude host's tracks
    tracks = filterPlayableTracks(tracks)
        .filter(t => !excludeTrackIds.has(t.id));

    // Check which of these tracks the user has saved
    const trackIds = tracks.map(t => t.id);
    const savedStatus = await checkSavedTracks(token, trackIds);

    // Exclude any saved tracks - these shouldn't be "traps"
    tracks = tracks.filter((_, i) => !savedStatus[i]);

    // Take top 5
    const traps = tracks.slice(0, TRACKS_PER_BUCKET).map(track =>
        createDeckItem(track, 'TRAP', 'LEFT', false)
    );

    // If we don't have enough, try with a different genre variation
    if (traps.length < TRACKS_PER_BUCKET) {
        console.warn(`Only got ${traps.length} trap tracks, trying alternative approach`);
        // Try with seed tracks instead of genre
        const topTracks = await getTopTracks(token, 'short_term', 5);
        const additionalRecs = await getRecommendations(token, {
            seedTracks: topTracks.slice(0, 2).map(t => t.id),
            limit: 50,
            targetPopularity: 75,
        });

        const filteredAdditional = filterPlayableTracks(additionalRecs)
            .filter(t => !excludeTrackIds.has(t.id))
            .filter(t => !traps.some(trap => trap.track_id === t.id));

        const needed = TRACKS_PER_BUCKET - traps.length;
        for (const track of filteredAdditional.slice(0, needed)) {
            traps.push(createDeckItem(track, 'TRAP', 'LEFT', false));
        }
    }

    return traps;
}

/**
 * Bucket C: The Icks (5 tracks)
 * Songs the host likely dislikes.
 * Correct swipe = LEFT
 */
async function generateIcks(token: string, hostTopGenre: string): Promise<DeckItem[]> {
    // Determine "ick genre" based on host's top genre
    const ickGenre = getIckGenre(hostTopGenre);

    // Get recommendations for the ick genre
    let tracks = await getRecommendations(token, {
        seedGenres: [ickGenre],
        limit: 100,
    });

    // Filter for playable tracks
    tracks = filterPlayableTracks(tracks);

    const icks = tracks.slice(0, TRACKS_PER_BUCKET).map(track =>
        createDeckItem(track, 'ICK', 'LEFT', false)
    );

    // Fallback if ick genre yields no results
    if (icks.length < TRACKS_PER_BUCKET) {
        console.warn(`Only got ${icks.length} ick tracks for genre "${ickGenre}". Trying fallback.`);
        const fallbackGenres = ['country', 'classical', 'opera', 'metal'];
        for (const genre of fallbackGenres) {
            if (genre === ickGenre) continue;

            const fallbackTracks = await getRecommendations(token, {
                seedGenres: [genre],
                limit: 20,
            });

            const filtered = filterPlayableTracks(fallbackTracks)
                .filter(t => !icks.some(ick => ick.track_id === t.id));

            const needed = TRACKS_PER_BUCKET - icks.length;
            for (const track of filtered.slice(0, needed)) {
                icks.push(createDeckItem(track, 'ICK', 'LEFT', false));
            }

            if (icks.length >= TRACKS_PER_BUCKET) break;
        }
    }

    return icks;
}

/**
 * Bucket D: The Culture (5 tracks)
 * Cultural awareness wildcards from Global Top 50.
 * Correct swipe = RIGHT if host has saved, LEFT otherwise
 */
async function generateCulture(token: string): Promise<DeckItem[]> {
    // Get Global Top 50 tracks
    let tracks = await getPlaylistTracks(token, GLOBAL_TOP_50_PLAYLIST_ID, 50);

    // Filter for playable tracks
    tracks = filterPlayableTracks(tracks);

    // Shuffle and take 5 candidates
    tracks = shuffle(tracks).slice(0, TRACKS_PER_BUCKET);

    // Check which ones the host has saved
    const trackIds = tracks.map(t => t.id);
    const savedStatus = await checkSavedTracks(token, trackIds);

    const culture = tracks.map((track, i) => {
        const hostHasSaved = savedStatus[i];
        return createDeckItem(
            track,
            'CULTURE',
            hostHasSaved ? 'RIGHT' : 'LEFT',
            hostHasSaved
        );
    });

    return culture;
}

/**
 * Determine the user's top genre from their top artists
 */
async function getTopGenre(token: string): Promise<string> {
    const artists = await getTopArtists(token, 'short_term', 10);

    // Count genre occurrences
    const genreCounts = new Map<string, number>();
    for (const artist of artists) {
        for (const genre of artist.genres) {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        }
    }

    // Find most frequent genre
    let topGenre = 'pop'; // Default fallback
    let maxCount = 0;
    for (const [genre, count] of genreCounts) {
        if (count > maxCount) {
            maxCount = count;
            topGenre = genre;
        }
    }

    // Normalize genre for Spotify API (replace spaces with hyphens)
    return normalizeGenre(topGenre);
}

/**
 * Map host's top genre to an "ick" genre they're likely to dislike
 */
function getIckGenre(hostGenre: string): string {
    const lowerGenre = hostGenre.toLowerCase();

    if (lowerGenre.includes('pop')) {
        return 'death-metal';
    }
    if (lowerGenre.includes('hip') || lowerGenre.includes('hop') || lowerGenre.includes('rap')) {
        return 'bluegrass';
    }
    if (lowerGenre.includes('country')) {
        return 'dubstep';
    }
    if (lowerGenre.includes('edm') || lowerGenre.includes('dance') || lowerGenre.includes('electronic')) {
        return 'opera';
    }

    // Default ick genre
    return 'country';
}

/**
 * Normalize genre string for Spotify API compatibility
 */
function normalizeGenre(genre: string): string {
    // Spotify genre seeds use lowercase with hyphens
    return genre.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Filter tracks to only include those with preview_url and album art
 */
function filterPlayableTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
    return tracks.filter(track =>
        track.preview_url !== null &&
        track.album.images.length > 0
    );
}

/**
 * Create a DeckItem from a SpotifyTrack
 */
function createDeckItem(
    track: SpotifyTrack,
    bucketType: BucketType,
    correctSwipe: 'RIGHT' | 'LEFT',
    hostHasSaved: boolean | null
): DeckItem {
    return {
        track_id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        image_url: track.album.images[0]?.url || '',
        audio_url: track.preview_url!, // We've filtered for non-null
        bucket_type: bucketType,
        correct_swipe: correctSwipe,
        host_has_saved: hostHasSaved,
    };
}

/**
 * Remove duplicate tracks by ID, keeping the first occurrence
 */
function dedupeByTrackId(items: DeckItem[]): DeckItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.track_id)) {
            return false;
        }
        seen.add(item.track_id);
        return true;
    });
}

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
