// Spotify Web API utilities with retry logic for rate limiting

import {
    SpotifyUser,
    SpotifyTrack,
    SpotifyArtist,
    SpotifyTopTracksResponse,
    SpotifyTopArtistsResponse,
    SpotifyRecommendationsResponse,
    SpotifyPlaylistTracksResponse,
} from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const MAX_RETRIES = 3;

interface SpotifyError {
    error: {
        status: number;
        message: string;
    };
}

/**
 * Generic Spotify API fetch with automatic retry on 429 (rate limiting).
 * Implements exponential backoff with Retry-After header support.
 */
export async function spotifyFetch<T>(
    path: string,
    token: string,
    retryCount = 0
): Promise<T> {
    const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE}${path}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
        // Rate limited - check Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, retryCount + 1);

        console.warn(`Spotify rate limited. Waiting ${waitSeconds}s before retry ${retryCount + 1}/${MAX_RETRIES}`);

        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        return spotifyFetch<T>(path, token, retryCount + 1);
    }

    if (!response.ok) {
        const error: SpotifyError = await response.json().catch(() => ({
            error: { status: response.status, message: response.statusText }
        }));
        throw new Error(`Spotify API error: ${error.error.status} - ${error.error.message}`);
    }

    return response.json();
}

/**
 * Get current user's profile
 */
export async function getMe(token: string): Promise<SpotifyUser> {
    return spotifyFetch<SpotifyUser>('/me', token);
}

/**
 * Get user's top tracks
 * @param timeRange - short_term (4 weeks), medium_term (6 months), long_term (years)
 * @param limit - Number of tracks to return (max 50)
 */
export async function getTopTracks(
    token: string,
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term',
    limit = 5
): Promise<SpotifyTrack[]> {
    const response = await spotifyFetch<SpotifyTopTracksResponse>(
        `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
        token
    );
    return response.items;
}

/**
 * Get user's top artists
 * @param timeRange - short_term (4 weeks), medium_term (6 months), long_term (years)
 * @param limit - Number of artists to return (max 50)
 */
export async function getTopArtists(
    token: string,
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term',
    limit = 10
): Promise<SpotifyArtist[]> {
    const response = await spotifyFetch<SpotifyTopArtistsResponse>(
        `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
        token
    );
    return response.items;
}

/**
 * Get recommendations based on seed genres
 */
export async function getRecommendations(
    token: string,
    options: {
        seedGenres?: string[];
        seedTracks?: string[];
        seedArtists?: string[];
        limit?: number;
        targetPopularity?: number;
    }
): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams();

    if (options.seedGenres?.length) {
        params.set('seed_genres', options.seedGenres.join(','));
    }
    if (options.seedTracks?.length) {
        params.set('seed_tracks', options.seedTracks.join(','));
    }
    if (options.seedArtists?.length) {
        params.set('seed_artists', options.seedArtists.join(','));
    }
    if (options.limit) {
        params.set('limit', options.limit.toString());
    }
    if (options.targetPopularity !== undefined) {
        params.set('target_popularity', options.targetPopularity.toString());
    }

    const response = await spotifyFetch<SpotifyRecommendationsResponse>(
        `/recommendations?${params.toString()}`,
        token
    );
    return response.tracks;
}

/**
 * Get tracks from a playlist
 * Using Spotify's Top 50 Global playlist ID: 37i9dQZEVXbMDoHDwVN2tF
 */
export async function getPlaylistTracks(
    token: string,
    playlistId: string,
    limit = 50
): Promise<SpotifyTrack[]> {
    const response = await spotifyFetch<SpotifyPlaylistTracksResponse>(
        `/playlists/${playlistId}/tracks?limit=${limit}&fields=items(track(id,name,artists,album,preview_url,popularity))`,
        token
    );
    return response.items
        .map(item => item.track)
        .filter((track): track is SpotifyTrack => track !== null);
}

// Spotify's Global Top 50 playlist ID
export const GLOBAL_TOP_50_PLAYLIST_ID = '37i9dQZEVXbMDoHDwVN2tF';

/**
 * Check if tracks are saved in user's library
 * @param trackIds - Array of track IDs to check (max 50 per request)
 * @returns Array of booleans corresponding to each track ID
 */
export async function checkSavedTracks(
    token: string,
    trackIds: string[]
): Promise<boolean[]> {
    if (trackIds.length === 0) return [];

    // Spotify API limits to 50 IDs per request
    const chunks: string[][] = [];
    for (let i = 0; i < trackIds.length; i += 50) {
        chunks.push(trackIds.slice(i, i + 50));
    }

    const results: boolean[] = [];
    for (const chunk of chunks) {
        const response = await spotifyFetch<boolean[]>(
            `/me/tracks/contains?ids=${chunk.join(',')}`,
            token
        );
        results.push(...response);
    }

    return results;
}

/**
 * Exchange authorization code for access token using PKCE
 */
export async function exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
    }

    return response.json();
}
