'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';
import { CHARACTERS, type Character } from '@faceroyale/game-core';
import { FighterCharacter } from '@/components/characters/FighterCharacter';

export default function CharactersPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [filter, setFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const filteredCharacters = filter === 'all'
    ? CHARACTERS
    : CHARACTERS.filter(c => c.rarity === filter);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return { from: '#6B7280', to: '#4B5563' };
      case 'rare': return { from: '#3B82F6', to: '#1D4ED8' };
      case 'epic': return { from: '#8B5CF6', to: '#6D28D9' };
      case 'legendary': return { from: '#F59E0B', to: '#D97706' };
      default: return { from: '#6B7280', to: '#4B5563' };
    }
  };

  const getExpressionFromPassive = (passive: string): 'neutral' | 'happy' | 'angry' | 'surprised' => {
    if (passive.includes('damage') || passive.includes('attack')) return 'angry';
    if (passive.includes('speed') || passive.includes('dodge')) return 'surprised';
    if (passive.includes('heal') || passive.includes('regen')) return 'happy';
    return 'neutral';
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
            <span style={{ color: 'white' }}>CHOOSE YOUR </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #FF3366, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              FIGHTER
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
            30 unique fighters with special abilities
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxWidth: '600px', margin: '0 auto' }}>
        {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map((r) => {
          const colors = getRarityColor(r);
          return (
            <button
              key={r}
              onClick={() => setFilter(r)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '100px',
                fontFamily: 'Bangers, cursive',
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: filter === r ? 'none' : '1px solid rgba(255,255,255,0.2)',
                background: filter === r
                  ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
                  : 'rgba(255,255,255,0.05)',
                color: filter === r ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              {r.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Characters Grid */}
      <div style={{ padding: '0 1rem 6rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {filteredCharacters.map((character, index) => {
            const rarityColors = getRarityColor(character.rarity);
            return (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedCharacter(character)}
                style={{
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  border: `2px solid ${
                    character.rarity === 'legendary' ? 'rgba(245,158,11,0.5)' :
                    character.rarity === 'epic' ? 'rgba(139,92,246,0.5)' :
                    character.rarity === 'rare' ? 'rgba(59,130,246,0.5)' :
                    'rgba(107,114,128,0.3)'
                  }`,
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.75rem',
                    background: `linear-gradient(135deg, ${character.primaryColor}40, ${character.secondaryColor}40)`,
                  }}
                >
                  <FighterCharacter
                    primaryColor={character.primaryColor}
                    secondaryColor={character.secondaryColor}
                    size="sm"
                    expression={getExpressionFromPassive(character.passive.effect)}
                    animate={false}
                  />
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.6)' }}>
                  <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '0.875rem', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {character.name}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', margin: '0.125rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {character.title}
                  </p>
                  <div
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 'bold',
                      background: `linear-gradient(135deg, ${rarityColors.from}, ${rarityColors.to})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {character.rarity.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Character Detail Modal */}
      <AnimatePresence>
        {selectedCharacter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCharacter(null)}
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
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0A0A0F',
                borderRadius: '1.5rem',
                maxWidth: '400px',
                width: '100%',
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${selectedCharacter.primaryColor}, ${selectedCharacter.secondaryColor})`,
                    }}
                  >
                    <FighterCharacter
                      primaryColor={selectedCharacter.primaryColor}
                      secondaryColor={selectedCharacter.secondaryColor}
                      size="sm"
                      expression={getExpressionFromPassive(selectedCharacter.passive.effect)}
                      animate={true}
                    />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.5rem', color: 'white', margin: 0 }}>
                      {selectedCharacter.name}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                      {selectedCharacter.title}
                    </p>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: `linear-gradient(135deg, ${getRarityColor(selectedCharacter.rarity).from}, ${getRarityColor(selectedCharacter.rarity).to})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {selectedCharacter.rarity.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCharacter(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {Object.entries(selectedCharacter.stats).map(([stat, value]) => (
                  <div key={stat} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{stat}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '0.375rem', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '100px',
                            width: `${(value as number) * 100}%`,
                            background: `linear-gradient(90deg, ${selectedCharacter.primaryColor}, ${selectedCharacter.secondaryColor})`,
                          }}
                        />
                      </div>
                      <span style={{ color: 'white', fontSize: '0.625rem', fontFamily: 'monospace' }}>{((value as number) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                {selectedCharacter.description}
              </p>

              {/* Passive Ability */}
              <div
                style={{
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: `linear-gradient(135deg, ${selectedCharacter.primaryColor}30, ${selectedCharacter.secondaryColor}30)`,
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.625rem', marginBottom: '0.25rem' }}>PASSIVE ABILITY</div>
                <div style={{ fontFamily: 'Bangers, cursive', color: 'white', fontSize: '1rem' }}>{selectedCharacter.passive.name}</div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>{selectedCharacter.passive.description}</p>
              </div>

              {/* Select Button */}
              <button
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.25rem',
                  fontFamily: 'Bangers, cursive',
                  color: 'white',
                  background: `linear-gradient(135deg, ${selectedCharacter.primaryColor}, ${selectedCharacter.secondaryColor})`,
                  border: 'none',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${selectedCharacter.primaryColor}50`,
                }}
              >
                SELECT FIGHTER
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
