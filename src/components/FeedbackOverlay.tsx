'use client';

// Feedback overlay component for correct/wrong visual feedback

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface FeedbackOverlayProps {
    isCorrect: boolean;
    isVisible: boolean;
    onComplete: () => void;
}

export default function FeedbackOverlay({ isCorrect, isVisible, onComplete }: FeedbackOverlayProps) {
    useEffect(() => {
        if (isVisible) {
            // Auto-hide after 1.5 seconds
            const timer = setTimeout(onComplete, 1500);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    if (!isVisible) return null;

    return (
        <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center ${isCorrect ? 'bg-green-500/30' : 'bg-red-500/30'
                }`}
            initial={{ opacity: 0 }}
            animate={isCorrect ? { opacity: 1 } : {
                opacity: 1,
                x: [0, -10, 10, -10, 10, 0], // Shake animation for wrong
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 300 }}
            >
                {isCorrect ? (
                    <>
                        <motion.div
                            className="text-8xl mb-4"
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                        >
                            ✓
                        </motion.div>
                        <motion.div
                            className="text-5xl font-bold text-white drop-shadow-lg"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            +1
                        </motion.div>
                        <p className="text-2xl text-white/80 mt-2">Correct!</p>
                    </>
                ) : (
                    <>
                        <motion.div
                            className="text-8xl mb-4"
                            animate={{
                                rotate: [0, -10, 10, -10, 10, 0],
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            ✗
                        </motion.div>
                        <p className="text-3xl font-bold text-white drop-shadow-lg">Wrong!</p>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
