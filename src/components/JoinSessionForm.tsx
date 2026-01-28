'use client';

// Client component for join session form

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinSessionForm() {
    const [sessionId, setSessionId] = useState('');
    const router = useRouter();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (sessionId.trim()) {
            router.push(`/play/${sessionId.trim()}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session code..."
                className="w-full py-4 px-6 bg-white/10 border border-gray-600 rounded-full text-white text-center text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
                type="submit"
                className="w-full py-4 px-8 bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold rounded-full transition-all transform hover:scale-105"
            >
                Join Session
            </button>
        </form>
    );
}
