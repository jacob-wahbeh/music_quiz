// Landing page for VibeCheck

import Link from 'next/link';
import JoinSessionForm from '@/components/JoinSessionForm';

// Check if mock mode is enabled at build time
const isMockMode = process.env.VIBECHECK_MOCK_MODE === '1';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex flex-col items-center justify-center p-6">
      {/* Mock mode indicator */}
      {isMockMode && (
        <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500 text-green-300 px-3 py-1 rounded-full text-sm">
          🎮 Mock Mode
        </div>
      )}

      {/* Logo and title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-pink-500 to-purple-500 mb-4">
          VibeCheck
        </h1>
        <p className="text-xl md:text-2xl text-gray-300">
          Tinder for Music 🎵
        </p>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          Find out how well you know your friend&apos;s music taste
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-6">
        {/* Host button - goes to host page in mock mode, or Spotify login otherwise */}
        <Link
          href={isMockMode ? "/host" : "/api/auth/login"}
          className="block w-full py-4 px-8 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full text-center transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
        >
          {isMockMode ? '🎮 Create Session (Demo)' : 'Log in as Host'}
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-600" />
          <span className="text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-600" />
        </div>

        {/* Join session form */}
        <JoinSessionForm />

        {/* Demo mode link */}
        <div className="text-center pt-4">
          <a
            href="/api/demo"
            className="text-gray-400 hover:text-white underline text-sm transition-colors"
          >
            🎮 Quick Demo (skip to play)
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-16 text-center max-w-lg">
        <h2 className="text-xl font-semibold text-white mb-6">How it works</h2>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-300">
          <div>
            <div className="text-3xl mb-2">1️⃣</div>
            <p>{isMockMode ? 'Host creates a session' : 'Host logs in with Spotify'}</p>
          </div>
          <div>
            <div className="text-3xl mb-2">2️⃣</div>
            <p>Share the link with a friend</p>
          </div>
          <div>
            <div className="text-3xl mb-2">3️⃣</div>
            <p>Swipe to guess their taste!</p>
          </div>
        </div>
      </div>
    </main>
  );
}
