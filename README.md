# VibeCheck - Tinder for Music 🎵

A high-energy music compatibility party game where friends guess each other's music taste through a Tinder-style swipe interface.

## Features

- **Spotify Integration**: Login with Spotify to analyze your listening history
- **Smart Deck Generation**: 20 tracks across 4 categories:
  - 🎵 **Anthems**: Your top tracks
  - 🪤 **Traps**: Songs that sound like you but aren't yours
  - 🤢 **Icks**: Songs you probably don't like
  - 🌍 **Culture**: Global Top 50 wildcards
- **Swipe Gameplay**: Intuitive left/right swiping with audio previews
- **Instant Feedback**: Sound effects and animations for correct/wrong guesses
- **Score Breakdown**: See how well your friend knows your music taste

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- A Spotify Developer account

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Optional: Upstash Redis for session caching (falls back to in-memory if not set)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/auth/callback` as a Redirect URI
4. Copy your Client ID to `.env.local`

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Play

1. **Host**: Log in with Spotify on the landing page
2. **Host**: Click "Create New Session" on the dashboard
3. **Host**: Share the generated link with a friend
4. **Guesser**: Open the link and tap "Start"
5. **Guesser**: Swipe RIGHT if you think the host LIKES the song
6. **Guesser**: Swipe LEFT if you think the host DOESN'T like it
7. See your score and breakdown at the end!

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Audio**: Howler.js
- **Cache**: Upstash Redis (with in-memory fallback)
- **Auth**: Spotify OAuth 2.0 with PKCE

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # PKCE auth initiation
│   │   │   └── callback/route.ts   # Token exchange
│   │   └── session/
│   │       ├── create/route.ts     # Deck generation
│   │       └── [sessionId]/route.ts # Session fetch
│   ├── host/page.tsx               # Host dashboard
│   ├── play/[sessionId]/page.tsx   # Game interface
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── SwipeCard.tsx               # Draggable card
│   ├── FeedbackOverlay.tsx         # Correct/wrong feedback
│   ├── AudioPlayer.tsx             # Audio playback
│   └── ResultsScreen.tsx           # End game results
└── lib/
    ├── types.ts                    # TypeScript types
    ├── pkce.ts                     # PKCE utilities
    ├── spotify.ts                  # Spotify API wrapper
    ├── redis.ts                    # Session cache
    └── deck.ts                     # Deck generation algorithm
```

## Sound Effects

To enable sound effects, add the following files to `/public/sounds/`:
- `ding.mp3` - Played on correct answers
- `buzzer.mp3` - Played on wrong answers

The app works without these files but will show console warnings.

## License

MIT
