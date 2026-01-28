'use client';

// Host Setup page - where the host swipes to define their preferences
// This creates the "answer key" for the game

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DeckItem, SwipeDirection } from '@/lib/types';
import SwipeCard from '@/components/SwipeCard';
import AudioPlayer from '@/components/AudioPlayer';
import { Howler, Howl } from 'howler';
import { v4 as uuidv4 } from 'uuid';

// Get shuffled tracks for host to swipe through
async function getShuffledTracks(): Promise<DeckItem[]> {
    const response = await fetch('/api/tracks/random?count=20');
    if (!response.ok) {
        throw new Error('Failed to fetch tracks');
    }
    return response.json();
}

export default function HostSetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tracks, setTracks] = useState<DeckItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hostPreferences, setHostPreferences] = useState<Map<string, SwipeDirection>>(new Map());

    // Game flow state
    const [hasStarted, setHasStarted] = useState(false);

    // Audio state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Session creation state
    const [creating, setCreating] = useState(false);

    // Load tracks on mount
    useEffect(() => {
        async function loadTracks() {
            try {
                const data = await getShuffledTracks();
                setTracks(data);
                // Don't auto-play anymore
                // setIsPlaying(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load tracks');
            } finally {
                setLoading(false);
            }
        }
        loadTracks();
    }, []);

    const startSwiping = async () => {
        // Unlock audio context strictly
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            await Howler.ctx.resume();
        }

        // Play silent unlock sound and WAIT for it to finish
        // This guarantees the browser has fully engaged the audio engine
        // Play silent unlock sound (don't wait for it)
        const unlock = new Howl({
            src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
            html5: false,
            volume: 0,
        });
        unlock.play();

        setHasStarted(true);
        // Now we can set playing with confidence
        setIsPlaying(true);
    };

    // Handle host swipe - records their preference
    const handleSwipe = useCallback((direction: SwipeDirection) => {
        const currentTrack = tracks[currentIndex];
        if (!currentTrack) return;

        // Record the host's preference
        setHostPreferences(prev => {
            const newMap = new Map(prev);
            newMap.set(currentTrack.track_id, direction);
            return newMap;
        });

        // Stop audio
        setIsPlaying(false);

        // Move to next track
        setTimeout(() => {
            if (currentIndex + 1 < tracks.length) {
                setCurrentIndex(prev => prev + 1);
                setIsPlaying(true);
            } else {
                // All tracks swiped - create session
                createSession();
            }
        }, 200);
    }, [tracks, currentIndex]);

    // Create the game session with host's preferences as the answer key
    const createSession = async () => {
        setCreating(true);

        try {
            // Build the deck with correct_swipe based on host's choices
            const deck: DeckItem[] = tracks.map(track => ({
                ...track,
                correct_swipe: hostPreferences.get(track.track_id) || 'RIGHT',
                bucket_type: 'CULTURE', // Simplified - all are culture in host mode
                host_has_saved: hostPreferences.get(track.track_id) === 'RIGHT',
            }));

            // Create session via API
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host_name: 'Host',
                    deck,
                    mode: 'host',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const session = await response.json();

            // Redirect to the share page
            router.push(`/host/share/${session.session_id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
            setCreating(false);
        }
    };

    const currentTrack = tracks[currentIndex];

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-white text-xl">Loading tracks...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <a
                        href="/"
                        className="inline-block py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    // Creating session state
    if (creating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-white text-xl">Creating your VibeCheck...</p>
                    <p className="text-gray-400 text-sm mt-2">Setting up the game with your preferences</p>
                </div>
            </div>
        );
    }

    // Start Screen - Ensures audio context is unlocked
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-6">🎧</div>
                    <h1 className="text-3xl font-bold text-white mb-4">Ready to Vibe?</h1>
                    <p className="text-gray-300 mb-8">
                        Swipe through 20 songs to define your taste.
                        <br />
                        <span className="text-green-400 font-bold">RIGHT</span> = Like
                        <br />
                        <span className="text-red-400 font-bold">LEFT</span> = Nope
                    </p>

                    <button
                        onClick={startSwiping}
                        className="py-5 px-10 bg-white text-purple-900 hover:bg-gray-100 text-xl font-bold rounded-full transition-all transform hover:scale-105 shadow-xl"
                    >
                        Start Swiping
                    </button>

                    <p className="text-gray-500 text-sm mt-6">
                        Sound will start automatically
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Audio player */}
            {currentTrack && (
                <AudioPlayer
                    audioUrl={currentTrack.audio_url}
                    isPlaying={isPlaying}
                    isMuted={isMuted}
                />
            )}

            {/* Header */}
            <div className="absolute top-4 left-4 right-4">
                <div className="text-center mb-4">
                    <h1 className="text-xl font-bold text-white">Your Turn to Swipe!</h1>
                    <p className="text-gray-400 text-sm">Swipe RIGHT on songs you like, LEFT on ones you don&apos;t</p>
                </div>

                {/* Progress bar */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                        {currentIndex + 1} / {tracks.length}
                    </span>
                    <span className="text-green-400 font-bold">
                        👍 {Array.from(hostPreferences.values()).filter(v => v === 'RIGHT').length}
                    </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                        style={{
                            width: `${(currentIndex / tracks.length) * 100}%`,
                        }}
                    />
                </div>
            </div>

            {/* Swipe card */}
            <div className="relative w-full max-w-sm h-[500px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {currentTrack && (
                        <SwipeCard
                            key={currentTrack.track_id}
                            item={currentTrack}
                            onSwipe={handleSwipe}
                            isActive={true}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <span className="text-2xl">🔇</span>
                    ) : (
                        <span className="text-2xl">🔊</span>
                    )}
                </button>
            </div>

            {/* Swipe hints */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-between px-8 pointer-events-none">
                <div className="text-red-400 text-lg font-medium opacity-70">
                    ← NOT MY VIBE
                </div>
                <div className="text-green-400 text-lg font-medium opacity-70">
                    LOVE IT →
                </div>
            </div>
        </div>
    );
}
