'use client';

// Host page - choose how to create a game session

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HostPage() {
    const router = useRouter();
    const [creatingDemo, setCreatingDemo] = useState(false);

    // Quick demo - auto-generate session
    const createDemoSession = async () => {
        setCreatingDemo(true);
        try {
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'mock' }),
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const session = await response.json();
            router.push(`/host/share/${session.session_id}`);
        } catch (err) {
            console.error('Error creating demo session:', err);
            setCreatingDemo(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">Create a VibeCheck</h1>
                    <p className="text-gray-300">Choose how you want to set up your game</p>
                </div>

                {/* Options */}
                <div className="space-y-6">
                    {/* Option 1: Host swipes first */}
                    <Link
                        href="/host/setup"
                        className="block bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-center hover:scale-[1.02] transition-transform"
                    >
                        <div className="text-5xl mb-4">🎧</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Swipe Your Preferences</h2>
                        <p className="text-white/80 text-sm">
                            Listen to 20 songs and swipe to tell us what you like.
                            Your friends will try to guess your taste!
                        </p>
                        <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-full text-sm text-white">
                            ~3 minutes to set up
                        </div>
                    </Link>

                    {/* Option 2: Quick demo */}
                    <button
                        onClick={createDemoSession}
                        disabled={creatingDemo}
                        className="w-full bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                        <div className="text-5xl mb-4">⚡</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Quick Demo</h2>
                        <p className="text-white/60 text-sm">
                            Auto-generate a game with random preferences.
                            Great for testing how the game works!
                        </p>
                        {creatingDemo && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-green-400">
                                <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full" />
                                Creating...
                            </div>
                        )}
                    </button>
                </div>

                {/* Back to home */}
                <div className="text-center mt-12">
                    <a href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← Back to home
                    </a>
                </div>
            </div>
        </main>
    );
}
