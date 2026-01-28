'use client';

// Swipeable card component using Framer Motion

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { DeckItem } from '@/lib/types';

interface SwipeCardProps {
    item: DeckItem;
    onSwipe: (direction: 'LEFT' | 'RIGHT') => void;
    isActive: boolean;
}

export default function SwipeCard({ item, onSwipe, isActive }: SwipeCardProps) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

    // Visual indicators for swipe direction
    const likeOpacity = useTransform(x, [0, 100], [0, 1]);
    const dislikeOpacity = useTransform(x, [-100, 0], [1, 0]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100; // pixels needed to trigger swipe

        if (info.offset.x > threshold) {
            onSwipe('RIGHT');
        } else if (info.offset.x < -threshold) {
            onSwipe('LEFT');
        }
    };

    if (!isActive) {
        return null;
    }

    // Determine if this is a local mock image (starts with /) or external URL
    const isLocalImage = item.image_url.startsWith('/');

    return (
        <motion.div
            className="absolute w-full max-w-sm aspect-[3/4] cursor-grab active:cursor-grabbing"
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
                x: x.get() > 0 ? 300 : -300,
                opacity: 0,
                transition: { duration: 0.2 }
            }}
        >
            {/* Card container */}
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-gray-900">
                {/* Album art - takes ~80% of the screen */}
                <div className="relative w-full h-[80%]">
                    {/* Use img tag for local files, works better with SVGs */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={item.image_url}
                        alt={`${item.name} album art`}
                        className="w-full h-full object-cover"
                    />

                    {/* Swipe indicators overlay */}
                    <motion.div
                        className="absolute inset-0 bg-green-500/40 flex items-center justify-center"
                        style={{ opacity: likeOpacity }}
                    >
                        <span className="text-6xl font-bold text-white rotate-[-15deg] border-4 border-white px-4 py-2 rounded-lg">
                            LIKE
                        </span>
                    </motion.div>

                    <motion.div
                        className="absolute inset-0 bg-red-500/40 flex items-center justify-center"
                        style={{ opacity: dislikeOpacity }}
                    >
                        <span className="text-6xl font-bold text-white rotate-[15deg] border-4 border-white px-4 py-2 rounded-lg">
                            NOPE
                        </span>
                    </motion.div>
                </div>

                {/* Track info */}
                <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-black via-black/90 to-transparent px-6 py-4 flex flex-col justify-center">
                    <h2 className="text-white text-2xl font-bold truncate">
                        {item.name}
                    </h2>
                    <p className="text-gray-300 text-lg truncate">
                        {item.artist}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
