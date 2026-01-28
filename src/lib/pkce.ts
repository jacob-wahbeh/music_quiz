// PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth
// Using Web Crypto API for secure random generation and hashing

/**
 * Generates a cryptographically secure random code verifier for PKCE.
 * The code verifier should be 43-128 characters, using unreserved URI characters.
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

/**
 * Generates a code challenge from the code verifier using SHA-256.
 * The challenge is the base64url-encoded SHA-256 hash of the verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64url encoding as per RFC 4648 Section 5.
 * Standard base64 with URL-safe characters and no padding.
 */
function base64UrlEncode(array: Uint8Array): string {
    // Convert Uint8Array to base64 string
    let binary = '';
    for (let i = 0; i < array.length; i++) {
        binary += String.fromCharCode(array[i]);
    }
    const base64 = btoa(binary);

    // Convert to base64url: replace + with -, / with _, and remove padding
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generates a random state parameter for OAuth to prevent CSRF attacks.
 */
export function generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}
