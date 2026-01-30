'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';

interface Arena {
  id: string;
  name: string;
  description: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  features: string[];
  unlocked: boolean;
}

const ARENAS: Arena[] = [
  {
    id: 'bean_island',
    name: 'Bean Island',
    description: 'A tropical paradise with palm trees and sandy beaches. Perfect for beginners.',
    theme: 'tropical',
    difficulty: 'easy',
    primaryColor: '#2ECC71',
    secondaryColor: '#27AE60',
    icon: '🏝️',
    features: ['Open terrain', 'Health spawns', 'Easy navigation'],
    unlocked: true,
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'A futuristic cityscape with glowing buildings and tight alleyways.',
    theme: 'cyberpunk',
    difficulty: 'medium',
    primaryColor: '#9B59B6',
    secondaryColor: '#8E44AD',
    icon: '🌃',
    features: ['Urban cover', 'Rooftop battles', 'Neon hazards'],
    unlocked: true,
  },
  {
    id: 'volcano_pit',
    name: 'Volcano Pit',
    description: 'A dangerous volcanic arena with lava streams and unstable ground.',
    theme: 'volcanic',
    difficulty: 'hard',
    primaryColor: '#E74C3C',
    secondaryColor: '#C0392B',
    icon: '🌋',
    features: ['Lava damage zones', 'Eruption events', 'Limited cover'],
    unlocked: true,
  },
  {
    id: 'frozen_tundra',
    name: 'Frozen Tundra',
    description: 'An icy wasteland where blizzards reduce visibility.',
    theme: 'arctic',
    difficulty: 'medium',
    primaryColor: '#3498DB',
    secondaryColor: '#2980B9',
    icon: '❄️',
    features: ['Slippery ice', 'Blizzard events', 'Ice caves'],
    unlocked: true,
  },
  {
    id: 'haunted_mansion',
    name: 'Haunted Mansion',
    description: 'A spooky estate with dark corridors and jump scares.',
    theme: 'horror',
    difficulty: 'hard',
    primaryColor: '#34495E',
    secondaryColor: '#2C3E50',
    icon: '👻',
    features: ['Dark areas', 'Teleport doors', 'Ghost NPCs'],
    unlocked: true,
  },
  {
    id: 'candy_kingdom',
    name: 'Candy Kingdom',
    description: 'A sweet and colorful arena made entirely of candy.',
    theme: 'fantasy',
    difficulty: 'easy',
    primaryColor: '#FF69B4',
    secondaryColor: '#FF1493',
    icon: '🍭',
    features: ['Bouncy terrain', 'Sugar rush zones', 'Sweet loot'],
    unlocked: true,
  },
  {
    id: 'space_station',
    name: 'Space Station',
    description: 'A zero-gravity battle in an orbiting space station.',
    theme: 'space',
    difficulty: 'hard',
    primaryColor: '#1A1A2E',
    secondaryColor: '#16213E',
    icon: '🚀',
    features: ['Zero gravity zones', 'Airlock hazards', 'Meteor showers'],
    unlocked: true,
  },
  {
    id: 'ancient_temple',
    name: 'Ancient Temple',
    description: 'Mysterious ruins filled with traps and treasures.',
    theme: 'ancient',
    difficulty: 'medium',
    primaryColor: '#D4AC0D',
    secondaryColor: '#B7950B',
    icon: '🏛️',
    features: ['Trap corridors', 'Hidden rooms', 'Boulder hazards'],
    unlocked: true,
  },
  {
    id: 'crystal_caves',
    name: 'Crystal Caves',
    description: 'Underground caverns filled with glowing crystals.',
    theme: 'underground',
    difficulty: 'medium',
    primaryColor: '#85C1E9',
    secondaryColor: '#5DADE2',
    icon: '💎',
    features: ['Crystal reflections', 'Underground lakes', 'Cave-ins'],
    unlocked: false,
  },
  {
    id: 'pirate_cove',
    name: 'Pirate Cove',
    description: 'A coastal hideout with shipwrecks and treasure.',
    theme: 'nautical',
    difficulty: 'easy',
    primaryColor: '#784212',
    secondaryColor: '#5D3408',
    icon: '🏴‍☠️',
    features: ['Ship battles', 'Water hazards', 'Cannon fire'],
    unlocked: false,
  },
  {
    id: 'robot_factory',
    name: 'Robot Factory',
    description: 'An automated facility with conveyor belts and crushers.',
    theme: 'industrial',
    difficulty: 'hard',
    primaryColor: '#7F8C8D',
    secondaryColor: '#566573',
    icon: '🤖',
    features: ['Moving platforms', 'Crusher hazards', 'Laser grids'],
    unlocked: false,
  },
  {
    id: 'mystic_forest',
    name: 'Mystic Forest',
    description: 'An enchanted woodland with magical creatures.',
    theme: 'magical',
    difficulty: 'medium',
    primaryColor: '#27AE60',
    secondaryColor: '#1E8449',
    icon: '🌲',
    features: ['Dense foliage', 'Magic portals', 'Healing springs'],
    unlocked: false,
  },
];

export default function ArenasPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const filteredArenas = filter === 'all'
    ? ARENAS
    : ARENAS.filter(a => a.difficulty === filter);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' };
      case 'medium': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' };
      case 'hard': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' };
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #050508 70%)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <span style={{ color: 'white' }}>Battle </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #FF3366, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Arenas
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
            12 unique battlegrounds
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxWidth: '600px', margin: '0 auto' }}>
        {(['all', 'easy', 'medium', 'hard'] as const).map((d) => {
          const colors = getDifficultyColor(d);
          return (
            <button
              key={d}
              onClick={() => setFilter(d)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '100px',
                fontFamily: 'Bangers, cursive',
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: filter === d ? 'none' : '1px solid rgba(255,255,255,0.2)',
                background: filter === d
                  ? 'linear-gradient(135deg, #FF3366, #6C5CE7)'
                  : 'rgba(255,255,255,0.05)',
                color: filter === d ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              {d.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Arenas Grid */}
      <div style={{ padding: '0 1rem 6rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {filteredArenas.map((arena, index) => {
            const diffColors = getDifficultyColor(arena.difficulty);
            return (
              <motion.div
                key={arena.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => arena.unlocked && setSelectedArena(arena)}
                style={{
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  border: `2px solid ${arena.unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                  background: 'rgba(255,255,255,0.05)',
                  cursor: arena.unlocked ? 'pointer' : 'not-allowed',
                  opacity: arena.unlocked ? 1 : 0.5,
                  position: 'relative',
                }}
              >
                {/* Arena Preview */}
                <div
                  style={{
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${arena.primaryColor}40, ${arena.secondaryColor}40)`,
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '4rem' }}>{arena.icon}</span>

                  {/* Difficulty Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '100px',
                      fontSize: '0.625rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: arena.difficulty === 'easy' ? 'rgba(46,204,113,0.3)' :
                                  arena.difficulty === 'medium' ? 'rgba(241,196,15,0.3)' :
                                  'rgba(231,76,60,0.3)',
                      color: arena.difficulty === 'easy' ? '#2ECC71' :
                             arena.difficulty === 'medium' ? '#F1C40F' :
                             '#E74C3C',
                    }}
                  >
                    {arena.difficulty}
                  </div>

                  {/* Lock Overlay */}
                  {!arena.unlocked && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '2rem' }}>🔒</span>
                    </div>
                  )}
                </div>

                {/* Arena Info */}
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.125rem', color: 'white', margin: '0 0 0.25rem 0' }}>
                    {arena.name}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 }}>
                    {arena.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Arena Detail Modal */}
      {selectedArena && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedArena(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0A0A0F',
              borderRadius: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${selectedArena.primaryColor}, ${selectedArena.secondaryColor})`,
                  fontSize: '2.5rem',
                }}
              >
                {selectedArena.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: 'white', margin: 0 }}>
                  {selectedArena.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  {selectedArena.theme.charAt(0).toUpperCase() + selectedArena.theme.slice(1)} Theme
                </p>
              </div>
              <button
                onClick={() => setSelectedArena(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {selectedArena.description}
            </p>

            {/* Features */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Arena Features
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedArena.features.map((feature) => (
                  <span
                    key={feature}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '100px',
                      background: `linear-gradient(135deg, ${selectedArena.primaryColor}30, ${selectedArena.secondaryColor}30)`,
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={() => {
                setSelectedArena(null);
                router.push('/play');
              }}
              style={{
                width: '100%',
                padding: '1rem 2rem',
                fontSize: '1.5rem',
                fontFamily: 'Bangers, cursive',
                color: 'white',
                background: `linear-gradient(135deg, ${selectedArena.primaryColor}, ${selectedArena.secondaryColor})`,
                border: 'none',
                borderRadius: '100px',
                cursor: 'pointer',
                boxShadow: `0 0 30px ${selectedArena.primaryColor}50`,
              }}
            >
              PLAY THIS ARENA
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
