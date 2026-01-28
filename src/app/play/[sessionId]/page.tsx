'use client';

// Play page - main game interface for guessers

import { useEffect, useState, useCallback, use } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameSession, GameState, CardResult, SwipeDirection } from '@/lib/types';
import SwipeCard from '@/components/SwipeCard';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import AudioPlayer, { useSoundEffects } from '@/components/AudioPlayer';
import ResultsScreen from '@/components/ResultsScreen';
import { Howler, Howl } from 'howler';

interface PlayPageProps {
    params: Promise<{ sessionId: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
    const { sessionId } = use(params);

    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Game state
    const [gameState, setGameState] = useState<GameState>({
        currentIndex: 0,
        score: 0,
        results: [],
        isComplete: false,
        hasStarted: false,
    });

    // Audio state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Feedback state
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastResult, setLastResult] = useState<boolean>(false);

    // Sound effects
    const { playDing, playBuzzer } = useSoundEffects();

    // Fetch session data
    useEffect(() => {
        async function fetchSession() {
            try {
                const response = await fetch(`/api/session/${sessionId}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Session not found');
                }
                const data: GameSession = await response.json();
                setSession(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load session');
            } finally {
                setLoading(false);
            }
        }

        fetchSession();
    }, [sessionId]);

    // Start the game
    const startGame = useCallback(async () => {
        // Resume context
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            await Howler.ctx.resume();
        }

        // Play silent unlock sound (don't wait for it)
        const unlock = new Howl({
            src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
            html5: false,
            volume: 0,
        });
        unlock.play();

        setGameState(prev => ({ ...prev, hasStarted: true }));
        setIsPlaying(true);
    }, []);

    // Handle swipe
    const handleSwipe = useCallback((direction: SwipeDirection) => {
        if (!session || gameState.currentIndex >= session.deck.length) return;

        const currentCard = session.deck[gameState.currentIndex];
        const isCorrect = direction === currentCard.correct_swipe;

        // Create result
        const result: CardResult = {
            track_id: currentCard.track_id,
            bucket_type: currentCard.bucket_type,
            swiped: direction,
            correct_swipe: currentCard.correct_swipe,
            is_correct: isCorrect,
        };

        // Play sound effect
        if (isCorrect) {
            playDing();
        } else {
            playBuzzer();
        }

        // Stop current audio
        setIsPlaying(false);

        // Show feedback
        setLastResult(isCorrect);
        setShowFeedback(true);

        // Update game state
        setGameState(prev => ({
            ...prev,
            score: isCorrect ? prev.score + 1 : prev.score,
            results: [...prev.results, result],
        }));
    }, [session, gameState.currentIndex, playDing, playBuzzer]);

    // Handle feedback complete - advance to next card
    const handleFeedbackComplete = useCallback(() => {
        setShowFeedback(false);

        setGameState(prev => {
            const nextIndex = prev.currentIndex + 1;
            const isComplete = session ? nextIndex >= session.deck.length : true;

            return {
                ...prev,
                currentIndex: nextIndex,
                isComplete,
            };
        });

        // Start playing next track
        if (session && gameState.currentIndex + 1 < session.deck.length) {
            setIsPlaying(true);
        }
    }, [session, gameState.currentIndex]);

    // Replay current track
    const replayTrack = useCallback(() => {
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    }, []);

    // Play again - reset game
    const playAgain = useCallback(() => {
        setGameState({
            currentIndex: 0,
            score: 0,
            results: [],
            isComplete: false,
            hasStarted: true,
        });
        setIsPlaying(true);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-white text-xl">Loading session...</p>
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
                    <h1 className="text-2xl font-bold text-white mb-2">Session Not Found</h1>
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

    // Results screen
    if (gameState.isComplete && session) {
        return (
            <ResultsScreen
                gameState={gameState}
                deck={session.deck}
                onPlayAgain={playAgain}
            />
        );
    }

    // Start screen
    if (!gameState.hasStarted && session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        {session.host_name}&apos;s VibeCheck
                    </h1>
                    <p className="text-gray-300 mb-2">
                        Swipe RIGHT if you think they LIKE the song
                    </p>
                    <p className="text-gray-300 mb-8">
                        Swipe LEFT if you think they DON&apos;T
                    </p>

                    <button
                        onClick={startGame}
                        className="py-6 px-12 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-full transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
                    >
                        Tap to Start
                    </button>

                    <p className="text-gray-500 text-sm mt-6">
                        🎧 Make sure your sound is on!
                    </p>
                </div>
            </div>
        );
    }

    // Main game view
    const currentCard = session?.deck[gameState.currentIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Audio player */}
            {currentCard && (
                <AudioPlayer
                    audioUrl={currentCard.audio_url}
                    isPlaying={isPlaying && !showFeedback}
                    isMuted={isMuted}
                />
            )}

            {/* Progress bar */}
            <div className="absolute top-4 left-4 right-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                        {gameState.currentIndex + 1} / {session?.deck.length || 20}
                    </span>
                    <span className="text-white font-bold">
                        Score: {gameState.score}
                    </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-purple-500 transition-all duration-300"
                        style={{
                            width: `${((gameState.currentIndex) / (session?.deck.length || 20)) * 100}%`,
                        }}
                    />
                </div>
            </div>

            {/* Swipe card */}
            <div className="relative w-full max-w-sm h-[500px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {currentCard && (
                        <SwipeCard
                            key={currentCard.track_id}
                            item={currentCard}
                            onSwipe={handleSwipe}
                            isActive={!showFeedback}
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
                <button
                    onClick={replayTrack}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Replay"
                >
                    <span className="text-2xl">🔄</span>
                </button>
            </div>

            {/* Swipe hints */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-between px-8 pointer-events-none">
                <div className="text-red-400 text-lg font-medium opacity-50">
                    ← NOPE
                </div>
                <div className="text-green-400 text-lg font-medium opacity-50">
                    LIKE →
                </div>
            </div>

            {/* Feedback overlay */}
            <FeedbackOverlay
                isCorrect={lastResult}
                isVisible={showFeedback}
                onComplete={handleFeedbackComplete}
            />
        </div>
    );
}
