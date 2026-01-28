// Session cache using Upstash Redis with in-memory fallback

import { GameSession } from './types';

const SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 hours

// In-memory fallback cache for local development
const memoryCache = new Map<string, { session: GameSession; expiresAt: number }>();

// Check if Upstash Redis is configured
function isUpstashConfigured(): boolean {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Upstash Redis REST API fetch helper
 */
async function upstashFetch(command: string[]): Promise<unknown> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        throw new Error('Upstash Redis not configured');
    }

    const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
    });

    if (!response.ok) {
        throw new Error(`Upstash Redis error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
}

/**
 * Store a game session with TTL
 */
export async function setSession(sessionId: string, session: GameSession): Promise<void> {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(session);

    if (isUpstashConfigured()) {
        try {
            await upstashFetch(['SET', key, value, 'EX', SESSION_TTL_SECONDS.toString()]);
            return;
        } catch (error) {
            console.warn('Redis setSession failed, falling back to memory:', error);
        }
    }

    // In-memory fallback
    console.log('Using in-memory cache for session storage');
    memoryCache.set(key, {
        session,
        expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    });

    // Clean up expired entries occasionally
    cleanupMemoryCache();
}

/**
 * Retrieve a game session by ID
 */
export async function getSession(sessionId: string): Promise<GameSession | null> {
    const key = `session:${sessionId}`;

    if (isUpstashConfigured()) {
        try {
            const result = await upstashFetch(['GET', key]);
            if (result && typeof result === 'string') {
                return JSON.parse(result) as GameSession;
            }
            return null;
        } catch (error) {
            console.warn('Redis getSession failed, falling back to memory:', error);
        }
    }

    // In-memory fallback
    const cached = memoryCache.get(key);
    if (!cached) {
        return null;
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
        memoryCache.delete(key);
        return null;
    }

    return cached.session;
}

/**
 * Delete a session (for cleanup/testing)
 */
export async function deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;

    if (isUpstashConfigured()) {
        try {
            await upstashFetch(['DEL', key]);
            return;
        } catch (error) {
            console.warn('Redis deleteSession failed:', error);
        }
    }

    memoryCache.delete(key);
}

/**
 * Clean up expired entries from in-memory cache
 */
function cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
        if (now > value.expiresAt) {
            memoryCache.delete(key);
        }
    }
}
