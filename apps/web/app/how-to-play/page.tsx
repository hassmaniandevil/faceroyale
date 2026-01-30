'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Move {
  name: string;
  trigger: string;
  description: string;
  icon: string;
  color: string;
  type: 'attack' | 'defense' | 'movement' | 'special';
}

const MOVES: Move[] = [
  {
    name: 'ROAR',
    trigger: 'Open Mouth Wide',
    description: 'Unleash a powerful cone attack that damages enemies in front of you.',
    icon: '😮',
    color: '#FF3366',
    type: 'attack',
  },
  {
    name: 'SHIELD',
    trigger: 'Raise Eyebrows',
    description: 'Create a protective barrier that absorbs incoming damage.',
    icon: '🤨',
    color: '#00D9FF',
    type: 'defense',
  },
  {
    name: 'BLAST',
    trigger: 'Puff Cheeks',
    description: 'Release a shockwave that pushes all nearby enemies back.',
    icon: '🐡',
    color: '#FFE66D',
    type: 'attack',
  },
  {
    name: 'DASH LEFT',
    trigger: 'Tilt Head Left',
    description: 'Quick dodge to the left, avoiding incoming attacks.',
    icon: '⬅️',
    color: '#00D26A',
    type: 'movement',
  },
  {
    name: 'DASH RIGHT',
    trigger: 'Tilt Head Right',
    description: 'Quick dodge to the right, avoiding incoming attacks.',
    icon: '➡️',
    color: '#00D26A',
    type: 'movement',
  },
  {
    name: 'LEAP',
    trigger: 'Look Up Quickly',
    description: 'Jump into the air briefly, becoming invulnerable to ground attacks.',
    icon: '⬆️',
    color: '#6C5CE7',
    type: 'movement',
  },
  {
    name: 'STOMP',
    trigger: 'Look Down Quickly',
    description: 'Slam the ground, stunning nearby enemies momentarily.',
    icon: '⬇️',
    color: '#FF6B35',
    type: 'attack',
  },
  {
    name: 'FURY',
    trigger: 'Mouth Open + Raised Brows',
    description: 'Enter rage mode - increased damage and speed for a short time.',
    icon: '😤',
    color: '#FF0066',
    type: 'special',
  },
  {
    name: 'REFLECT',
    trigger: 'Puff Cheeks + Raised Brows',
    description: 'Create a mirror shield that reflects projectiles back at enemies.',
    icon: '🪞',
    color: '#00FFFF',
    type: 'defense',
  },
  {
    name: 'MEGA BLAST',
    trigger: 'Mouth Open + Puff Cheeks',
    description: 'Massive area explosion dealing heavy damage to all nearby foes.',
    icon: '💥',
    color: '#FF00FF',
    type: 'special',
  },
];

const TIPS = [
  'Move your head smoothly - jerky movements can cause misfires!',
  'Calibrate before each session for best accuracy.',
  'Combine moves strategically - Shield then attack!',
  'Stay inside the safe zone - the storm does damage over time.',
  'Watch enemy health bars to know when to strike.',
  'Use DASH to escape when surrounded.',
  'STOMP is great for interrupting enemy attacks.',
  'FURY + ROAR combo deals massive damage!',
];

export default function HowToPlayPage() {
  const router = useRouter();
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [activeTab, setActiveTab] = useState<'moves' | 'controls' | 'tips'>('moves');

  const typeColors = {
    attack: { bg: 'rgba(255, 51, 102, 0.2)', border: '#FF3366' },
    defense: { bg: 'rgba(0, 217, 255, 0.2)', border: '#00D9FF' },
    movement: { bg: 'rgba(0, 210, 106, 0.2)', border: '#00D26A' },
    special: { bg: 'rgba(108, 92, 231, 0.2)', border: '#6C5CE7' },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #050508 70%)',
        padding: '1rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
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
            <span style={{ color: 'white' }}>HOW TO </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #FF3366, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PLAY
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
            Master the art of face-controlled combat
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['moves', 'controls', 'tips'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '100px',
              fontFamily: 'Bangers, cursive',
              fontSize: '1rem',
              cursor: 'pointer',
              border: activeTab === tab ? 'none' : '1px solid rgba(255,255,255,0.2)',
              background: activeTab === tab
                ? 'linear-gradient(135deg, #FF3366, #6C5CE7)'
                : 'rgba(255,255,255,0.05)',
              color: 'white',
            }}
          >
            {tab === 'moves' && '🎯 MOVES'}
            {tab === 'controls' && '🎮 CONTROLS'}
            {tab === 'tips' && '💡 TIPS'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'moves' && (
          <motion.div
            key="moves"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Type Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(typeColors).map(([type, colors]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: colors.border,
                    }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {type}
                  </span>
                </div>
              ))}
            </div>

            {/* Moves Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {MOVES.map((move, index) => {
                const colors = typeColors[move.type];
                return (
                  <motion.div
                    key={move.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedMove(move)}
                    style={{
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      borderRadius: '1rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${colors.border}50` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${move.color}40, ${move.color}80)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                        }}
                      >
                        {move.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: 'Bangers, cursive', fontSize: '1.25rem', color: move.color, margin: 0 }}>
                          {move.name}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                          {move.trigger}
                        </p>
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: '0.75rem 0 0 0', lineHeight: 1.4 }}>
                      {move.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'controls' && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ maxWidth: '600px' }}
          >
            {/* Face Diagram */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '1.5rem',
                padding: '2rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>😐</div>
              <h3 style={{ fontFamily: 'Bangers, cursive', color: 'white', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
                YOUR FACE IS THE CONTROLLER
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                Position your face in front of the camera and make expressions to trigger moves!
              </p>
            </div>

            {/* Controls List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'Bangers, cursive', color: '#FFE66D', margin: '0 0 0.75rem 0' }}>
                  🏃 MOVEMENT
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  <strong>Tilt your head</strong> in any direction to move your character.
                  The further you tilt, the faster you move. Keep your head centered to stay still.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'Bangers, cursive', color: '#FF3366', margin: '0 0 0.75rem 0' }}>
                  ⚔️ ATTACKS
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  <strong>Open your mouth</strong> to ROAR and damage enemies in front.
                  <br />
                  <strong>Puff your cheeks</strong> to BLAST and knock back nearby foes.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'Bangers, cursive', color: '#00D9FF', margin: '0 0 0.75rem 0' }}>
                  🛡️ DEFENSE
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  <strong>Raise your eyebrows</strong> to activate SHIELD and absorb damage.
                  Combine with other moves for advanced defensive techniques!
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'Bangers, cursive', color: '#6C5CE7', margin: '0 0 0.75rem 0' }}>
                  ✨ COMBOS
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  Perform multiple expressions at once for powerful combo moves!
                  <br />
                  Try: <strong>Mouth + Brows</strong> for FURY mode,
                  or <strong>Mouth + Puff</strong> for MEGA BLAST!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tips' && (
          <motion.div
            key="tips"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ maxWidth: '600px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {TIPS.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '1rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FFE66D, #FF3366)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Bangers, cursive',
                      fontSize: '0.875rem',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                    {tip}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Warning */}
            <div
              style={{
                marginTop: '2rem',
                background: 'rgba(255, 51, 102, 0.1)',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                borderRadius: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              <h4 style={{ fontFamily: 'Bangers, cursive', color: '#FF3366', margin: '0 0 0.5rem 0' }}>
                ⚠️ IMPORTANT
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                Make sure you have good lighting on your face. The game works best in a well-lit room
                without strong backlighting. Position your camera at eye level for best tracking.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Detail Modal */}
      <AnimatePresence>
        {selectedMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMove(null)}
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
                padding: '2rem',
                border: `2px solid ${selectedMove.color}`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${selectedMove.color}40, ${selectedMove.color}80)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  margin: '0 auto 1.5rem',
                }}
              >
                {selectedMove.icon}
              </div>
              <h2 style={{ fontFamily: 'Bangers, cursive', fontSize: '2.5rem', color: selectedMove.color, margin: 0 }}>
                {selectedMove.name}
              </h2>
              <div
                style={{
                  margin: '1rem 0',
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '100px',
                  display: 'inline-block',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>TRIGGER: </span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedMove.trigger}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.6, margin: '1rem 0 1.5rem' }}>
                {selectedMove.description}
              </p>
              <button
                onClick={() => setSelectedMove(null)}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontFamily: 'Bangers, cursive',
                  background: selectedMove.color,
                  border: 'none',
                  borderRadius: '100px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                GOT IT!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Button */}
      <div style={{ position: 'fixed', bottom: '1.5rem', left: '1rem', right: '1rem', textAlign: 'center' }}>
        <button
          onClick={() => router.push('/play')}
          style={{
            padding: '1rem 3rem',
            fontSize: '1.5rem',
            fontFamily: 'Bangers, cursive',
            background: 'linear-gradient(135deg, #FF3366, #6C5CE7)',
            border: 'none',
            borderRadius: '100px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255, 51, 102, 0.4)',
          }}
        >
          START PLAYING!
        </button>
      </div>
    </div>
  );
}
