# VibeCheck (Spotify Only) – Build Instructions for Claude Code

You are Claude Code acting as a senior full stack engineer. Build an MVP of **VibeCheck**, a high energy music compatibility party game: “Tinder for music”.

Deliver a working app with:
- Spotify login
- Host creates a session
- App generates a 20 track deck from Spotify using the exact bucket rules below
- Guesser plays the swiper, with instant right or wrong feedback and scoring
- Session deck is cached so we do not re query Spotify during play

## Product Definition

### Roles
- Host: logs in with Spotify and creates a session
- Guesser: joins via link and swipes

### Core loop
1. Host creates a session and shares the session link
2. Guesser swipes through 20 cards
3. After each swipe, show instant feedback and points
4. End screen shows score and bucket breakdown

## Tech Stack

### Web app
- Next.js 14+ App Router
- TypeScript
- Tailwind CSS
- Framer Motion for swipe animations and feedback overlays
- Howler for sound effects (ding, buzzer)

### Backend
- Next.js Route Handlers under `/app/api/*`
- Session cache: Upstash Redis (or local memory fallback if no Redis configured)
- Spotify Web API via fetch

### Spotify auth
- OAuth 2.0 with PKCE
- Store access token in HTTP only cookie (preferred) or in server session store keyed by a session cookie
- Required scopes:
  - user-top-read
  - user-library-read

### Audio strategy
- Primary: play Spotify `preview_url` if present
- If `preview_url` is null, do not include the track in the deck (filter it out during deck generation)
- Do not implement Spotify Web Playback SDK in v1, because it is Premium gated and complicates autoplay policies
- Ensure autoplay works by requiring a single user interaction before audio begins:
  - On the guesser screen, show “Tap to start” once
  - After tap, allow audio to auto play for subsequent cards

## Repo and Project Setup

### Create project
- `npx create-next-app@latest vibecheck --ts --app --tailwind --eslint`
- Install dependencies:
  - `npm i framer-motion howler ioredis uuid`
  - optional for nicer request validation: `npm i zod`
- Create `.env.local` with:
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `SPOTIFY_CLIENT_ID=...`
  - `SPOTIFY_CLIENT_SECRET=...` (only needed if you use authorization code flow without PKCE; prefer PKCE and avoid using secret on client)
  - `SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback`
  - `UPSTASH_REDIS_REST_URL=...` (optional)
  - `UPSTASH_REDIS_REST_TOKEN=...` (optional)

### Spotify developer config
- In Spotify Developer Dashboard:
  - add redirect URI exactly matching `SPOTIFY_REDIRECT_URI`
  - ensure app is in development mode for testing accounts

## High Level Architecture

### Pages
- `/` landing
  - button: “Log in as Host”
  - input: “Join session” + button
- `/host`
  - host status
  - button: “Create new session”
  - shows share link: `/play/[sessionId]`
  - shows deck preview list (names only) and counts per bucket
- `/play/[sessionId]`
  - swipe deck for guesser
  - scoring and feedback overlays
  - end screen

### API routes
- `GET /api/auth/login`
  - starts Spotify PKCE auth, redirects to Spotify
- `GET /api/auth/callback`
  - exchanges code for token
  - stores token in secure cookie
  - redirects to `/host`
- `POST /api/session/create`
  - requires host token
  - generates deck via Spotify Web API
  - stores GameSession in Redis with TTL
  - returns session JSON
- `GET /api/session/:sessionId`
  - returns cached GameSession from Redis
  - no Spotify calls

### Data model
GameSession:
- session_id: uuid v4
- host_id: Spotify user id
- created_at: ISO timestamp
- deck: array of 20 DeckItem

DeckItem:
- track_id: spotify track id string
- name
- artist
- image_url
- audio_url: preview_url
- bucket_type: ANTHEM | TRAP | ICK | CULTURE
- correct_swipe: RIGHT | LEFT
- host_has_saved: boolean (only for CULTURE, else null or false)

Important: store the deck order randomized.

## Spotify Web API Endpoints Needed

Host identity:
- `GET https://api.spotify.com/v1/me`

Top tracks:
- `GET https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5`

Top artists for genre inference:
- `GET https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=10`

Liked tracks membership check:
- `GET https://api.spotify.com/v1/me/tracks/contains?ids={comma_separated_track_ids}`

Recommendations:
- `GET https://api.spotify.com/v1/recommendations?...`

Global Top 50 tracks:
- Use Spotify Top 50 Global playlist tracks endpoint:
  - First get playlist id for “Top 50 Global” using search or hardcode the playlist id once you find it
  - Then fetch tracks:
    - `GET https://api.spotify.com/v1/playlists/{playlist_id}/tracks?limit=50`

## Deck Generation Algorithm (Exact Requirements)

Generate 20 tracks using 4 buckets, 5 tracks each. The host never manually selects tracks.

### Shared constraints for all buckets
- For every candidate track:
  - Must have `preview_url` not null
  - Must have at least one image (album art)
- Remove duplicates across all buckets by track id
- If any bucket ends with fewer than 5 after filtering, refill by expanding the query window for that bucket until it reaches 5 or you hit a safe retry limit

### Bucket A: The Anthems (5)
Source:
- host top tracks short_term, limit 5

Logic:
- correct_swipe is RIGHT

Filter:
- preview_url must exist

### Bucket B: The Traps (5)
Goal:
- songs that resemble host taste but are not actually listened to

Source:
- recommendations seeded by host top genre
- target_popularity around 80

Steps:
1. Determine host top genre:
   - fetch host top artists
   - collect genres from those artists
   - take the most frequent genre string
2. Call recommendations with:
   - `seed_genres=topGenre`
   - `limit=100` (request more, then filter down)
   - `target_popularity=80`
3. Exclude:
   - any track that is in Bucket A
   - any track the user has saved in their library using `/me/tracks/contains`
   - any track that appears in the host top tracks list (Bucket A plus optionally a larger top tracks set if you fetched more)

Logic:
- correct_swipe is LEFT

Filter:
- preview_url must exist

### Bucket C: The Icks (5)
Goal:
- songs the host likely dislikes

Source:
- recommendations seeded by a genre distinct from host top genre

Steps:
1. Choose an “ick genre” based on the host top genre with a deterministic mapping:
   - If host genre includes pop: choose death-metal
   - If includes hip hop or rap: choose bluegrass
   - If includes country: choose dubstep
   - If includes edm or dance: choose opera
   - Else default: country
2. Call recommendations with:
   - `seed_genres=ickGenre`
   - `limit=100`
3. Filter:
   - remove duplicates
   - preview_url required

Logic:
- correct_swipe is LEFT

### Bucket D: The Culture (5)
Goal:
- cultural awareness wildcards

Source:
- Global Top 50 playlist tracks

Steps:
1. Pull up to 50 tracks from the playlist
2. Filter to preview_url available
3. Randomize and take 5 candidates
4. For these 5 tracks, call `/me/tracks/contains` to mark host_has_saved
5. correct_swipe:
   - RIGHT if host_has_saved is true
   - LEFT otherwise

## Robustness Requirements

### Caching and rate limits
- `POST /api/session/create` must cache the full GameSession in Redis
- `GET /api/session/:sessionId` must only read from Redis and must never hit Spotify
- Set TTL to 6 hours
- Add basic retry with exponential backoff for Spotify 429 responses:
  - if 429, read `Retry-After` header and wait that many seconds server side when feasible
  - cap retries to 3

### Error handling
- If auth token missing or expired:
  - return 401 with a JSON error
- If deck generation fails to assemble 20 valid preview tracks after retries:
  - return 500 with a helpful error message
- If Redis unavailable:
  - fallback to in memory Map for local dev, warn in server logs

### Security
- Do not expose Spotify tokens to the browser JavaScript if possible
- Use HTTP only secure cookies for token storage
- Ensure CORS is not opened broadly

## UI and UX Requirements

### Visual
- Minimalist
- Album art takes ~80 percent of the screen on play view
- Big swipe affordances, simple text, high contrast

### Swipe behavior
- Use framer motion drag to implement swipe
- Right swipe means “Host likes”
- Left swipe means “Host dislikes”
- On swipe completion:
  1. compute correctness immediately
  2. show overlay feedback
  3. freeze for 1.5 seconds
  4. advance to next card and auto play its preview

### Feedback effects
- Correct:
  - green flash overlay
  - ding sound
  - +1 point animation
- Wrong:
  - red flash overlay
  - buzzer sound
  - screen shake
- Perfect game:
  - confetti animation on results screen

### Audio
- Preview auto plays on card render after initial user interaction gate
- Provide a mute toggle
- Provide a replay button for current preview

### State
- Keep local game state on guesser page:
  - currentIndex
  - score
  - per card results array
- Do not write results to backend in v1

## Implementation Plan

### Phase 1: Auth
- Implement PKCE helpers:
  - code_verifier generation
  - code_challenge SHA256 base64url
- `/api/auth/login` redirects to Spotify authorize URL
- `/api/auth/callback` exchanges code for access token, sets cookie, redirects to `/host`

### Phase 2: Deck generation
- Create `lib/spotify.ts`:
  - `spotifyFetch(path, token)`
  - typed response helpers
- Create `lib/deck.ts`:
  - `generateDeck(token): Promise<GameSession>`
  - helper functions:
    - `getTopTracks`
    - `getTopGenre`
    - `getRecommendationsByGenre`
    - `getGlobalTopTracks`
    - `checkSavedTracks`
    - `filterPlayableTracks`
    - `dedupeByTrackId`
    - `shuffle`
- Ensure 4 buckets built and then merged, deduped, shuffled
- Cache the final session JSON

### Phase 3: Host UI
- `/host` page:
  - shows logged in host name from `/api/me` or cached
  - button create session
  - displays share link and copy to clipboard

### Phase 4: Play UI
- `/play/[sessionId]`:
  - loads session JSON from API
  - renders swipe deck
  - plays audio previews
  - shows feedback overlay and scoring
  - results screen

## Testing Checklist

Auth:
- login works
- refresh keeps you logged in
- expired token leads to 401 and UI shows “Log in again”

Deck:
- always 20 tracks
- no duplicates
- every track has preview_url and image_url
- buckets are exactly 5 each
- Bucket B excludes saved and top tracks
- Bucket D correct_swipe matches saved status

Gameplay:
- swipe left right works smoothly
- feedback overlay timing is 1.5 seconds
- audio plays for each card after initial tap
- mute works

## Deliverables

1. Full Next.js repo implementing the above
2. `README.md` with:
   - local setup
   - env vars
   - how to run
3. `instructions.md` is this file

## Notes and Tradeoffs
- Do not implement Spotify Web Playback SDK in MVP
- If previews are too sparse for some users, then implement a fallback strategy later:
  - expand recommendation limits and query variants
  - optionally allow Premium playback as a paid enhancement
