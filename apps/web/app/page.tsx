'use client';

import { useRouter } from 'next/navigation';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const setAuth = usePlayerStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const ensureAuth = () => {
    if (!isAuthenticated) {
      const guestId = `guest_${Date.now()}`;
      const guestName = `Player${Math.floor(Math.random() * 10000)}`;
      setAuth({
        userId: guestId,
        username: guestName,
        accessToken: 'guest-token',
        refreshToken: 'guest-refresh',
        isGuest: true,
      });
    }
  };

  const navigateTo = (path: string) => {
    ensureAuth();
    router.push(path);
  };

  const handlePlay = () => {
    setIsLoading(true);
    ensureAuth();
    router.push('/play');
  };

  // Simple bean character component
  const BeanCharacter = ({ color, size, crown }: { color: string; size: number; crown?: boolean }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {crown && (
        <div style={{ position: 'absolute', top: -size * 0.3, left: '50%', transform: 'translateX(-50%)', fontSize: size * 0.4 }}>
          👑
        </div>
      )}
      {/* Head */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}99)`,
          boxShadow: `0 ${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.3), inset 0 -${size * 0.1}px ${size * 0.15}px rgba(0,0,0,0.2)`,
          position: 'relative',
        }}
      >
        {/* Eyes */}
        <div style={{ position: 'absolute', top: '35%', left: '25%', width: size * 0.15, height: size * 0.15, borderRadius: '50%', background: 'white' }}>
          <div style={{ position: 'absolute', top: '30%', left: '30%', width: '50%', height: '50%', borderRadius: '50%', background: '#1a1a2e' }} />
        </div>
        <div style={{ position: 'absolute', top: '35%', right: '25%', width: size * 0.15, height: size * 0.15, borderRadius: '50%', background: 'white' }}>
          <div style={{ position: 'absolute', top: '30%', left: '30%', width: '50%', height: '50%', borderRadius: '50%', background: '#1a1a2e' }} />
        </div>
        {/* Smile */}
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: size * 0.3,
            height: size * 0.15,
            borderRadius: '0 0 50% 50%',
            border: `${size * 0.03}px solid #1a1a2e`,
            borderTop: 'none',
          }}
        />
      </div>
      {/* Body */}
      <div
        style={{
          width: size * 0.7,
          height: size * 0.5,
          borderRadius: '50% 50% 45% 45%',
          background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
          margin: '-10% auto 0',
          boxShadow: `0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.3)`,
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #050508 100%)',
        padding: '2rem 1rem',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Characters */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ animation: 'bounce 2s infinite', animationDelay: '0.2s' }}>
          <BeanCharacter color="#FF3366" size={60} />
        </div>
        <div style={{ animation: 'bounce 2s infinite' }}>
          <BeanCharacter color="#FFE66D" size={80} crown />
        </div>
        <div style={{ animation: 'bounce 2s infinite', animationDelay: '0.4s' }}>
          <BeanCharacter color="#6C5CE7" size={60} />
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 'clamp(3.5rem, 12vw, 6rem)',
          fontFamily: "'Bangers', cursive",
          letterSpacing: '0.05em',
          background: 'linear-gradient(135deg, #FF3366 0%, #6C5CE7 50%, #00D9FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          margin: 0,
          filter: 'drop-shadow(0 0 30px rgba(255,51,102,0.5))',
          lineHeight: 1,
        }}
      >
        FACE ROYALE
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontFamily: "'Bangers', cursive",
          color: '#FFE66D',
          textShadow: '0 0 20px rgba(255,230,109,0.5)',
          margin: '0.5rem 0 1.5rem 0',
          textAlign: 'center',
        }}
      >
        BATTLE ROYALE WITH YOUR FACE!
      </p>

      {/* Feature Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { emoji: '😮', text: 'OPEN MOUTH = ROAR' },
          { emoji: '🤨', text: 'RAISE BROWS = SHIELD' },
          { emoji: '🐡', text: 'PUFF CHEEKS = BLAST' },
        ].map((item) => (
          <div
            key={item.text}
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
            <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'white' }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Main Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '360px' }}>
        <button
          onClick={handlePlay}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '1.25rem 2rem',
            fontSize: '2.25rem',
            fontFamily: "'Bangers', cursive",
            color: 'white',
            background: 'linear-gradient(135deg, #FF3366 0%, #6C5CE7 100%)',
            border: 'none',
            borderRadius: '100px',
            cursor: 'pointer',
            boxShadow: '0 0 40px rgba(255,51,102,0.6), 0 8px 20px rgba(0,0,0,0.4)',
            letterSpacing: '0.05em',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(255,51,102,0.8), 0 12px 30px rgba(0,0,0,0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.6), 0 8px 20px rgba(0,0,0,0.4)';
          }}
        >
          {isLoading ? 'LOADING...' : 'PLAY NOW'}
        </button>
        <button
          onClick={() => navigateTo('/lobby')}
          style={{
            width: '100%',
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            fontFamily: "'Bangers', cursive",
            color: 'white',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '100px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = '#00D9FF';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
        >
          CREATE ROOM
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', margin: '2rem 0' }}>
        {[
          { value: '30', label: 'FIGHTERS' },
          { value: '12', label: 'ARENAS' },
          { value: '10', label: 'MOVES' },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontFamily: "'Bangers', cursive",
                background: 'linear-gradient(135deg, #FF3366, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
        {[
          { emoji: '❓', label: 'HOW TO PLAY', path: '/how-to-play', color: '#FFE66D' },
          { emoji: '👤', label: 'FIGHTERS', path: '/characters', color: '#FF3366' },
          { emoji: '🗺️', label: 'ARENAS', path: '/arenas', color: '#00D9FF' },
          { emoji: '🛒', label: 'STORE', path: '/store', color: '#00D26A' },
          { emoji: '🏆', label: 'RANKS', path: '/leaderboard', color: '#6C5CE7' },
          { emoji: '👥', label: 'LOBBY', path: '/lobby', color: '#FF9F43' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigateTo(item.path)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1rem 0.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = item.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{item.emoji}</div>
            <div style={{ fontSize: '0.75rem', fontFamily: "'Bangers', cursive", color: item.color }}>{item.label}</div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
        Face Royale - A FaceFights Experience
      </footer>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
