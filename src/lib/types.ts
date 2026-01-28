// TypeScript types for VibeCheck application

export type BucketType = 'ANTHEM' | 'TRAP' | 'ICK' | 'CULTURE';
export type SwipeDirection = 'RIGHT' | 'LEFT';

export interface DeckItem {
    track_id: string;
    name: string;
    artist: string;
    image_url: string;
    audio_url: string; // Spotify preview_url
    bucket_type: BucketType;
    correct_swipe: SwipeDirection;
    host_has_saved: boolean | null; // Only meaningful for CULTURE bucket
}

export interface GameSession {
    session_id: string;
    host_id: string;
    host_name: string;
    created_at: string; // ISO timestamp
    deck: DeckItem[];
}

// Spotify API response types

export interface SpotifyUser {
    id: string;
    display_name: string | null;
    email?: string;
    images?: { url: string }[];
}

export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: SpotifyAlbum;
    preview_url: string | null;
    popularity: number;
}

export interface SpotifyTopTracksResponse {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
}

export interface SpotifyTopArtistsResponse {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
}

export interface SpotifyRecommendationsResponse {
    tracks: SpotifyTrack[];
    seeds: { id: string; type: string }[];
}

export interface SpotifyPlaylistTracksResponse {
    items: { track: SpotifyTrack }[];
    total: number;
    limit: number;
    offset: number;
}

// Client-side game state types

export interface CardResult {
    track_id: string;
    bucket_type: BucketType;
    swiped: SwipeDirection;
    correct_swipe: SwipeDirection;
    is_correct: boolean;
}

export interface GameState {
    currentIndex: number;
    score: number;
    results: CardResult[];
    isComplete: boolean;
    hasStarted: boolean;
}
