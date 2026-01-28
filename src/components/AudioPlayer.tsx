'use client';

// Audio player component using Howler.js

import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';

interface AudioPlayerProps {
    audioUrl: string;
    isPlaying: boolean;
    isMuted: boolean;
    onEnded?: () => void;
}

export default function AudioPlayer({ audioUrl, isPlaying, isMuted, onEnded }: AudioPlayerProps) {
    const soundRef = useRef<Howl | null>(null);
    const prevUrlRef = useRef<string>('');
    const pendingPlayRef = useRef<boolean>(false);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (soundRef.current) {
            soundRef.current.unload();
            soundRef.current = null;
        }
        pendingPlayRef.current = false;
    }, []);

    // Initialize or update sound when URL changes
    useEffect(() => {
        if (audioUrl !== prevUrlRef.current) {
            cleanup();
            prevUrlRef.current = audioUrl;

            soundRef.current = new Howl({
                src: [audioUrl],
                html5: true, // Use HTML5 audio for streaming
                volume: isMuted ? 0 : 0.7,
                preload: true,
                // autoplay: isPlaying, // REMOVED: Managed entirely by useEffect below
                onload: () => {
                    // console.log('Audio loaded');
                },
                onend: () => {
                    onEnded?.();
                },
                onloaderror: (id, error) => {
                    console.error('Audio load error:', error);
                },
                onplayerror: (id, error) => {
                    console.error('Audio play error:', error);
                    // Retry play on user interaction
                    if (soundRef.current) {
                        soundRef.current.once('unlock', () => {
                            if (isPlaying) soundRef.current?.play();
                        });
                    }
                },
            });
        }

        return cleanup;
    }, [audioUrl, cleanup, isMuted, onEnded]); // isPlaying removed from dependency to avoid re-init

    // Handle play/pause
    useEffect(() => {
        if (!soundRef.current) return;

        if (isPlaying) {
            // Check if audio is loaded
            const state = soundRef.current.state();
            if (state === 'loaded') {
                if (!soundRef.current.playing()) {
                    soundRef.current.play();
                }
            } else if (state === 'loading') {
                // Wait for load
                soundRef.current.once('load', () => {
                    if (isPlaying && !soundRef.current?.playing()) {
                        soundRef.current?.play();
                    }
                });
            }
        } else {
            soundRef.current.pause();
        }
    }, [isPlaying]);

    // Handle mute changes
    useEffect(() => {
        if (!soundRef.current) return;
        soundRef.current.volume(isMuted ? 0 : 0.7);
    }, [isMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    // This component doesn't render anything visible
    return null;
}

// Sound effects manager
export function useSoundEffects() {
    const dingRef = useRef<Howl | null>(null);
    const buzzerRef = useRef<Howl | null>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        // Initialize sound effects with error handling
        // Sound files should be placed in /public/sounds/
        try {
            dingRef.current = new Howl({
                src: ['/sounds/ding.wav'],
                volume: 0.5,
                preload: true,
                onloaderror: () => {
                    console.warn('Ding sound not found. Add ding.wav to /public/sounds/');
                    dingRef.current = null;
                },
            });

            buzzerRef.current = new Howl({
                src: ['/sounds/buzzer.wav'],
                volume: 0.5,
                preload: true,
                onloaderror: () => {
                    console.warn('Buzzer sound not found. Add buzzer.wav to /public/sounds/');
                    buzzerRef.current = null;
                },
            });
        } catch (e) {
            console.warn('Could not load sound effects:', e);
        }

        return () => {
            dingRef.current?.unload();
            buzzerRef.current?.unload();
        };
    }, []);

    const playDing = useCallback(() => {
        dingRef.current?.play();
    }, []);

    const playBuzzer = useCallback(() => {
        buzzerRef.current?.play();
    }, []);

    return { playDing, playBuzzer };
}
