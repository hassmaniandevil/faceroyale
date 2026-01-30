'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';
import { CHARACTERS } from '@faceroyale/game-core';
import { FighterCharacter } from '@/components/characters/FighterCharacter';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  type: 'character' | 'skin' | 'emote' | 'bundle';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: { coins?: number; gems?: number };
  primaryColor: string;
  secondaryColor: string;
  icon?: string;
}

const STORE_ITEMS: StoreItem[] = [
  // Featured Characters (Legendary)
  ...CHARACTERS.filter(c => c.rarity === 'legendary').map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: 'character' as const,
    rarity: c.rarity,
    price: { gems: 500 },
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
  })),
  // Epic Characters
  ...CHARACTERS.filter(c => c.rarity === 'epic').slice(0, 4).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: 'character' as const,
    rarity: c.rarity,
    price: { gems: 250 },
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
  })),
  // Skins
  {
    id: 'skin_golden',
    name: 'Golden Shine',
    description: 'Make your fighter gleam with a golden aura',
    type: 'skin',
    rarity: 'legendary',
    price: { gems: 300 },
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    icon: '✨',
  },
  {
    id: 'skin_neon',
    name: 'Neon Glow',
    description: 'Electric neon outline effect',
    type: 'skin',
    rarity: 'epic',
    price: { gems: 200 },
    primaryColor: '#00FF00',
    secondaryColor: '#00FFFF',
    icon: '💫',
  },
  {
    id: 'skin_shadow',
    name: 'Shadow Form',
    description: 'Dark and mysterious shadow effect',
    type: 'skin',
    rarity: 'rare',
    price: { coins: 2000 },
    primaryColor: '#1a1a2e',
    secondaryColor: '#16213e',
    icon: '🌑',
  },
  // Emotes
  {
    id: 'emote_gg',
    name: 'GG',
    description: 'Show good sportsmanship',
    type: 'emote',
    rarity: 'common',
    price: { coins: 500 },
    primaryColor: '#4A90D9',
    secondaryColor: '#2E5A8C',
    icon: '🤝',
  },
  {
    id: 'emote_laugh',
    name: 'LOL',
    description: 'Laugh it off',
    type: 'emote',
    rarity: 'rare',
    price: { coins: 1000 },
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    icon: '😂',
  },
  {
    id: 'emote_fire',
    name: 'On Fire',
    description: 'Show dominance',
    type: 'emote',
    rarity: 'epic',
    price: { gems: 100 },
    primaryColor: '#FF4500',
    secondaryColor: '#FF6347',
    icon: '🔥',
  },
  // Bundles
  {
    id: 'bundle_starter',
    name: 'Starter Pack',
    description: '3 Random Characters + 1000 Coins',
    type: 'bundle',
    rarity: 'rare',
    price: { gems: 199 },
    primaryColor: '#6C5CE7',
    secondaryColor: '#4834D4',
    icon: '📦',
  },
  {
    id: 'bundle_legend',
    name: 'Legendary Bundle',
    description: 'All 3 Legendary Characters',
    type: 'bundle',
    rarity: 'legendary',
    price: { gems: 999 },
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    icon: '👑',
  },
];

export default function StorePage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { coins, gems } = usePlayerStore();
  const [filter, setFilter] = useState<'all' | 'character' | 'skin' | 'emote' | 'bundle'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const filteredItems = filter === 'all'
    ? STORE_ITEMS
    : STORE_ITEMS.filter(item => item.type === filter);

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '0 0 20px rgba(255, 215, 0, 0.5)';
      case 'epic': return '0 0 15px rgba(155, 89, 182, 0.5)';
      case 'rare': return '0 0 10px rgba(52, 152, 219, 0.5)';
      default: return 'none';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #050508 70%)',
        paddingBottom: '100px',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontFamily: 'Bangers, cursive', margin: 0 }}>
              <span style={{ color: 'white' }}>Item </span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE66D, #FF9F43)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Store
              </span>
            </h1>
          </div>
        </div>

        {/* Currency Display */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '100px',
              padding: '0.5rem 1rem',
            }}
          >
            <span>🪙</span>
            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{coins.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '100px',
              padding: '0.5rem 1rem',
            }}
          >
            <span>💎</span>
            <span style={{ color: '#00D9FF', fontWeight: 'bold' }}>{gems.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxWidth: '600px', margin: '0 auto' }}>
        {(['all', 'character', 'skin', 'emote', 'bundle'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '100px',
              fontFamily: 'Bangers, cursive',
              fontSize: '0.875rem',
              cursor: 'pointer',
              border: filter === type ? 'none' : '1px solid rgba(255,255,255,0.2)',
              background: filter === type
                ? 'linear-gradient(135deg, #FF3366, #6C5CE7)'
                : 'rgba(255,255,255,0.05)',
              color: filter === type ? 'white' : 'rgba(255,255,255,0.6)',
            }}
          >
            {type === 'all' ? 'ALL' : type.toUpperCase() + 'S'}
          </button>
        ))}
      </div>

      {/* Featured Banner */}
      <div style={{ padding: '0 1rem 1rem', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(108,92,231,0.3))',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#00D9FF', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>FEATURED</div>
            <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: 'white', margin: '0 0 0.25rem 0' }}>Daily Deals</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Special offers refresh in 12:34:56</p>
          </div>
          <span style={{ fontSize: '3rem' }}>✨</span>
        </div>
      </div>

      {/* Store Grid */}
      <div style={{ padding: '0 1rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              style={{
                borderRadius: '1rem',
                overflow: 'hidden',
                border: `2px solid ${
                  item.rarity === 'legendary' ? 'rgba(255,215,0,0.5)' :
                  item.rarity === 'epic' ? 'rgba(155,89,182,0.5)' :
                  item.rarity === 'rare' ? 'rgba(52,152,219,0.5)' :
                  'rgba(255,255,255,0.1)'
                }`,
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                boxShadow: getRarityGlow(item.rarity),
              }}
            >
              {/* Item Preview */}
              <div
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${item.primaryColor}30, ${item.secondaryColor}30)`,
                  position: 'relative',
                }}
              >
                {item.type === 'character' ? (
                  <FighterCharacter
                    primaryColor={item.primaryColor}
                    secondaryColor={item.secondaryColor}
                    size="md"
                    expression="happy"
                    animate={false}
                  />
                ) : (
                  <span style={{ fontSize: '4rem' }}>{item.icon}</span>
                )}

                {/* Rarity Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '100px',
                    fontSize: '0.5rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: item.rarity === 'legendary' ? 'rgba(255,215,0,0.3)' :
                               item.rarity === 'epic' ? 'rgba(155,89,182,0.3)' :
                               item.rarity === 'rare' ? 'rgba(52,152,219,0.3)' :
                               'rgba(128,128,128,0.3)',
                    color: item.rarity === 'legendary' ? '#FFD700' :
                           item.rarity === 'epic' ? '#9B59B6' :
                           item.rarity === 'rare' ? '#3498DB' :
                           '#808080',
                  }}
                >
                  {item.rarity}
                </div>

                {/* Type Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '100px',
                    fontSize: '0.5rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {item.type}
                </div>
              </div>

              {/* Item Info */}
              <div style={{ padding: '0.75rem' }}>
                <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1rem', color: 'white', margin: '0 0 0.25rem 0' }}>
                  {item.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  {item.description.slice(0, 50)}...
                </p>

                {/* Price & Buy */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {item.price.gems && (
                      <>
                        <span>💎</span>
                        <span style={{ color: '#00D9FF', fontWeight: 'bold', fontSize: '0.875rem' }}>{item.price.gems}</span>
                      </>
                    )}
                    {item.price.coins && (
                      <>
                        <span>🪙</span>
                        <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.875rem' }}>{item.price.coins}</span>
                      </>
                    )}
                  </div>
                  <button
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #FF3366, #6C5CE7)',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    BUY
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Get More Currency */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          background: 'linear-gradient(to top, #050508, transparent)',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '1rem',
              fontFamily: 'Bangers, cursive',
              fontSize: '1.25rem',
              background: 'linear-gradient(135deg, #00D26A, #27AE60)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>💎</span>
            <span>Get More Gems</span>
          </button>
        </div>
      </div>
    </div>
  );
}
