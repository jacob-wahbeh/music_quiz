'use client';

// Results screen component for end of game

import { motion } from 'framer-motion';
import { GameState, DeckItem } from '@/lib/types';
import { useEffect, useState } from 'react';

interface ResultsScreenProps {
    gameState: GameState;
    deck: DeckItem[];
    onPlayAgain: () => void;
}

export default function ResultsScreen({ gameState, deck, onPlayAgain }: ResultsScreenProps) {
    const [showConfetti, setShowConfetti] = useState(false);

    const totalQuestions = deck.length;
    const score = gameState.score;
    const isPerfect = score === totalQuestions;

    // Count results by bucket
    const bucketResults = {
        ANTHEM: { correct: 0, total: 0 },
        TRAP: { correct: 0, total: 0 },
        ICK: { correct: 0, total: 0 },
        CULTURE: { correct: 0, total: 0 },
    };

    deck.forEach((item, index) => {
        const result = gameState.results[index];
        if (result) {
            bucketResults[item.bucket_type].total++;
            if (result.is_correct) {
                bucketResults[item.bucket_type].correct++;
            }
        }
    });

    useEffect(() => {
        if (isPerfect) {
            setShowConfetti(true);
        }
    }, [isPerfect]);

    const getScoreMessage = () => {
        const percentage = (score / totalQuestions) * 100;
        if (percentage === 100) return "Perfect! You know them perfectly! 🎉";
        if (percentage >= 80) return "Amazing! You really get their vibe! 🔥";
        if (percentage >= 60) return "Pretty good! You know them well! 👍";
        if (percentage >= 40) return "Not bad! Room for improvement! 🎵";
        return "Keep listening together! 🎧";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex flex-col items-center justify-center p-6">
            {/* Confetti animation for perfect score */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-3 h-3 rounded-full"
                            style={{
                                background: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'][i % 5],
                                left: `${Math.random() * 100}%`,
                            }}
                            initial={{ y: -20, opacity: 1 }}
                            animate={{
                                y: '100vh',
                                opacity: 0,
                                rotate: Math.random() * 720,
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                delay: Math.random() * 0.5,
                                ease: 'easeOut',
                            }}
                        />
                    ))}
                </div>
            )}

            <motion.div
                className="text-center max-w-md w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Score display */}
                <motion.div
                    className="mb-8"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                >
                    <div className="text-8xl font-bold text-white mb-2">
                        {score}/{totalQuestions}
                    </div>
                    <p className="text-2xl text-gray-300">{getScoreMessage()}</p>
                </motion.div>

                {/* Bucket breakdown */}
                <motion.div
                    className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 className="text-xl font-semibold text-white mb-4">Breakdown</h3>
                    <div className="space-y-3">
                        <BucketRow
                            name="🎵 Anthems"
                            description="Their favorites"
                            correct={bucketResults.ANTHEM.correct}
                            total={bucketResults.ANTHEM.total}
                        />
                        <BucketRow
                            name="🪤 Traps"
                            description="Sounds like them, but not"
                            correct={bucketResults.TRAP.correct}
                            total={bucketResults.TRAP.total}
                        />
                        <BucketRow
                            name="🤢 Icks"
                            description="Not their vibe"
                            correct={bucketResults.ICK.correct}
                            total={bucketResults.ICK.total}
                        />
                        <BucketRow
                            name="🌍 Culture"
                            description="Chart awareness"
                            correct={bucketResults.CULTURE.correct}
                            total={bucketResults.CULTURE.total}
                        />
                    </div>
                </motion.div>

                {/* Play again button */}
                <motion.button
                    className="w-full py-4 px-8 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full transition-colors"
                    onClick={onPlayAgain}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    Play Again
                </motion.button>
            </motion.div>
        </div>
    );
}

function BucketRow({
    name,
    description,
    correct,
    total
}: {
    name: string;
    description: string;
    correct: number;
    total: number;
}) {
    const percentage = total > 0 ? (correct / total) * 100 : 0;

    return (
        <div className="flex items-center justify-between text-white">
            <div className="flex-1">
                <div className="font-medium">{name}</div>
                <div className="text-sm text-gray-400">{description}</div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-green-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    />
                </div>
                <span className="text-sm font-mono w-12 text-right">{correct}/{total}</span>
            </div>
        </div>
    );
}
