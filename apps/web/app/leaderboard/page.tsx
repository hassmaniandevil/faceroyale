'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';

interface LeaderboardEntry {
  rank: number;
  username: string;
  wins: number;
  eliminations: number;
  topTens: number;
  avatar: string;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: 'FaceKing', wins: 247, eliminations: 1892, topTens: 412, avatar: '👑' },
  { rank: 2, username: 'ExpressionMaster', wins: 231, eliminations: 1756, topTens: 389, avatar: '😎' },
  { rank: 3, username: 'BrowBoss', wins: 198, eliminations: 1634, topTens: 356, avatar: '🤨' },
  { rank: 4, username: 'ScreamQueen', wins: 187, eliminations: 1523, topTens: 334, avatar: '😱' },
  { rank: 5, username: 'WinkMaster', wins: 176, eliminations: 1412, topTens: 312, avatar: '😉' },
  { rank: 6, username: 'SmileSlay', wins: 165, eliminations: 1301, topTens: 298, avatar: '😊' },
  { rank: 7, username: 'FuryFace', wins: 154, eliminations: 1245, topTens: 276, avatar: '😠' },
  { rank: 8, username: 'NeutralNinja', wins: 143, eliminations: 1189, topTens: 254, avatar: '😐' },
  { rank: 9, username: 'PuffPro', wins: 132, eliminations: 1078, topTens: 234, avatar: '😤' },
  { rank: 10, username: 'CharmChamp', wins: 121, eliminations: 967, topTens: 212, avatar: '💋' },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { username } = usePlayerStore();
  const [tab, setTab] = useState<'wins' | 'eliminations' | 'topTens'>('wins');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const sortedLeaderboard = [...MOCK_LEADERBOARD].sort((a, b) => b[tab] - a[tab]);

  return (
    <main className="min-h-screen bg-gradient-hero">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ff-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ff-secondary/20 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold">
            <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-white/60 text-sm">Top Face Fighters worldwide</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 px-4 py-4">
        <div className="flex gap-2 max-w-md mx-auto bg-white/5 border border-white/10 rounded-xl p-1">
          {(['wins', 'eliminations', 'topTens'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-lg font-display text-sm transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-ff-primary to-ff-secondary text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t === 'topTens' ? 'TOP 10s' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="relative z-10 px-4 py-8">
        <div className="max-w-md mx-auto flex items-end justify-center gap-4">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-4xl mb-2 mx-auto">
              {sortedLeaderboard[1]?.avatar}
            </div>
            <div className="text-white font-bold text-sm truncate max-w-20">{sortedLeaderboard[1]?.username}</div>
            <div className="text-white/40 text-xs">{sortedLeaderboard[1]?.[tab].toLocaleString()}</div>
            <div className="w-20 h-16 bg-gray-500/30 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-gray-300">2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-5xl mb-2 mx-auto shadow-lg shadow-yellow-500/30">
              {sortedLeaderboard[0]?.avatar}
            </div>
            <div className="text-white font-bold truncate max-w-24">{sortedLeaderboard[0]?.username}</div>
            <div className="text-ff-yellow text-sm font-bold">{sortedLeaderboard[0]?.[tab].toLocaleString()}</div>
            <div className="w-24 h-24 bg-yellow-500/30 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-3xl font-display font-bold text-yellow-400">1</span>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-4xl mb-2 mx-auto">
              {sortedLeaderboard[2]?.avatar}
            </div>
            <div className="text-white font-bold text-sm truncate max-w-20">{sortedLeaderboard[2]?.username}</div>
            <div className="text-white/40 text-xs">{sortedLeaderboard[2]?.[tab].toLocaleString()}</div>
            <div className="w-20 h-12 bg-orange-700/30 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-orange-400">3</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Rest of Leaderboard */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-md mx-auto space-y-2">
          {sortedLeaderboard.slice(3).map((entry, index) => (
            <motion.div
              key={entry.username}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3"
            >
              <div className="w-8 text-center font-display font-bold text-white/40">
                {index + 4}
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                {entry.avatar}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold">{entry.username}</div>
                <div className="text-white/40 text-xs">{entry[tab].toLocaleString()} {tab}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Your Rank */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-ff-darker to-transparent z-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 bg-gradient-to-r from-ff-primary/30 to-ff-secondary/30 border border-white/20 rounded-xl p-3">
            <div className="w-8 text-center font-display font-bold text-white">
              #127
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
              😊
            </div>
            <div className="flex-1">
              <div className="text-white font-bold">{username || 'You'}</div>
              <div className="text-ff-accent text-xs">12 wins</div>
            </div>
            <div className="text-xs text-white/40">YOUR RANK</div>
          </div>
        </div>
      </div>
    </main>
  );
}
