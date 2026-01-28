'use client';

// Share page - shown after host completes their swipes
// Provides a link/QR for friends to join and play

import { use } from 'react';
import { useState } from 'react';

interface SharePageProps {
    params: Promise<{ sessionId: string }>;
}

export default function SharePage({ params }: SharePageProps) {
    const { sessionId } = use(params);
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/play/${sessionId}`
        : `/play/${sessionId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                {/* Success icon */}
                <div className="text-8xl mb-6">🎉</div>

                <h1 className="text-3xl font-bold text-white mb-2">
                    Your VibeCheck is Ready!
                </h1>

                <p className="text-gray-300 mb-8">
                    Share this link with your friends and see if they can guess your music taste!
                </p>

                {/* Share link box */}
                <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <p className="text-gray-400 text-sm mb-2">Share this link:</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 bg-white/10 text-white px-4 py-3 rounded-lg text-sm truncate"
                        />
                        <button
                            onClick={copyToClipboard}
                            className={`px-4 py-3 rounded-lg font-medium transition-all ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Native share button for mobile */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                        onClick={() => {
                            navigator.share({
                                title: 'VibeCheck - Can you guess my music taste?',
                                url: shareUrl,
                            });
                        }}
                        className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full transition-all mb-4"
                    >
                        📱 Share Link
                    </button>
                )}

                {/* Play yourself link */}
                <a
                    href={`/play/${sessionId}`}
                    className="inline-block text-purple-400 hover:text-purple-300 underline"
                >
                    Or try it yourself →
                </a>

                {/* Back home */}
                <div className="mt-8">
                    <a
                        href="/"
                        className="text-gray-500 hover:text-gray-300 text-sm"
                    >
                        ← Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
