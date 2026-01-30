'use client';

import { motion } from 'framer-motion';

interface FighterCharacterProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'neutral' | 'happy' | 'angry' | 'surprised' | 'wink';
  animate?: boolean;
  accessory?: 'none' | 'headband' | 'crown' | 'helmet' | 'glasses' | 'bandana';
  glowEffect?: boolean;
}

const SIZES = {
  xs: { head: 36, body: 28, eye: 6, pupil: 3, stroke: 1.5 },
  sm: { head: 50, body: 40, eye: 8, pupil: 4, stroke: 2 },
  md: { head: 80, body: 60, eye: 12, pupil: 6, stroke: 2.5 },
  lg: { head: 120, body: 90, eye: 18, pupil: 9, stroke: 3 },
  xl: { head: 160, body: 120, eye: 24, pupil: 12, stroke: 4 },
};

export function FighterCharacter({
  primaryColor,
  secondaryColor,
  accentColor = '#FFE66D',
  size = 'md',
  expression = 'neutral',
  animate = true,
  accessory = 'none',
  glowEffect = false,
}: FighterCharacterProps) {
  const s = SIZES[size];

  // Derive darker shade for outlines
  const darkerPrimary = adjustBrightness(primaryColor, -30);

  const Wrapper = animate ? motion.div : 'div';
  const AnimatedDiv = animate ? motion.div : 'div';
  const animationProps = animate ? {
    animate: { y: [0, -4, 0] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  } : {};

  const eyeAnimation = animate ? {
    animate: { x: [-1, 1, -1] },
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
  } : {};

  return (
    <Wrapper
      {...animationProps}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: s.head,
        height: s.head + s.body * 0.6,
        filter: glowEffect ? `drop-shadow(0 0 ${s.head * 0.15}px ${primaryColor})` : undefined,
      }}
    >
      {/* Head */}
      <div
        style={{
          position: 'relative',
          width: s.head,
          height: s.head,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${lighten(primaryColor, 20)}, ${primaryColor} 50%, ${secondaryColor} 100%)`,
          boxShadow: `
            0 ${s.head * 0.08}px ${s.head * 0.15}px rgba(0,0,0,0.4),
            inset 0 ${s.head * 0.02}px ${s.head * 0.05}px rgba(255,255,255,0.3),
            inset 0 -${s.head * 0.08}px ${s.head * 0.12}px rgba(0,0,0,0.3)
          `,
          border: `${s.stroke}px solid ${darkerPrimary}`,
        }}
      >
        {/* Main highlight */}
        <div
          style={{
            position: 'absolute',
            width: s.head * 0.35,
            height: s.head * 0.2,
            top: s.head * 0.08,
            left: s.head * 0.12,
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '50%',
            filter: `blur(${s.head * 0.05}px)`,
          }}
        />

        {/* Secondary highlight */}
        <div
          style={{
            position: 'absolute',
            width: s.head * 0.15,
            height: s.head * 0.1,
            top: s.head * 0.15,
            left: s.head * 0.55,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: '50%',
            filter: `blur(${s.head * 0.03}px)`,
          }}
        />

        {/* Eyes Container */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            gap: s.head * 0.18,
            top: s.head * 0.32,
            left: 0,
            right: 0,
          }}
        >
          {/* Left Eye */}
          <div
            style={{
              position: 'relative',
              width: s.eye * 1.3,
              height: expression === 'surprised' ? s.eye * 1.5 : s.eye * 1.1,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #E8E8E8 100%)',
              boxShadow: `
                inset 0 ${s.eye * 0.1}px ${s.eye * 0.15}px rgba(0,0,0,0.15),
                0 ${s.eye * 0.05}px ${s.eye * 0.1}px rgba(0,0,0,0.2)
              `,
              transform: expression === 'wink' ? 'scaleY(0.15)' : undefined,
              transition: 'transform 0.15s ease',
            }}
          >
            {expression !== 'wink' && (
              <AnimatedDiv
                {...eyeAnimation}
                style={{
                  position: 'absolute',
                  width: s.pupil * 1.4,
                  height: s.pupil * 1.4,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 40%, #3d3d3d, #1a1a2e)',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, ${expression === 'angry' ? '-40%' : '-50%'})`,
                }}
              >
                {/* Pupil highlight */}
                <div
                  style={{
                    position: 'absolute',
                    width: s.pupil * 0.5,
                    height: s.pupil * 0.5,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    top: '15%',
                    right: '15%',
                  }}
                />
                {/* Small secondary highlight */}
                <div
                  style={{
                    position: 'absolute',
                    width: s.pupil * 0.25,
                    height: s.pupil * 0.25,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                    bottom: '20%',
                    left: '20%',
                  }}
                />
              </AnimatedDiv>
            )}
          </div>

          {/* Right Eye */}
          <div
            style={{
              position: 'relative',
              width: s.eye * 1.3,
              height: expression === 'surprised' ? s.eye * 1.5 : s.eye * 1.1,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #E8E8E8 100%)',
              boxShadow: `
                inset 0 ${s.eye * 0.1}px ${s.eye * 0.15}px rgba(0,0,0,0.15),
                0 ${s.eye * 0.05}px ${s.eye * 0.1}px rgba(0,0,0,0.2)
              `,
            }}
          >
            <AnimatedDiv
              {...eyeAnimation}
              style={{
                position: 'absolute',
                width: s.pupil * 1.4,
                height: s.pupil * 1.4,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 40%, #3d3d3d, #1a1a2e)',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, ${expression === 'angry' ? '-40%' : '-50%'})`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: s.pupil * 0.5,
                  height: s.pupil * 0.5,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  top: '15%',
                  right: '15%',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: s.pupil * 0.25,
                  height: s.pupil * 0.25,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.6)',
                  bottom: '20%',
                  left: '20%',
                }}
              />
            </AnimatedDiv>
          </div>
        </div>

        {/* Eyebrows */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            gap: s.head * 0.12,
            top: expression === 'surprised' ? s.head * 0.18 : expression === 'angry' ? s.head * 0.26 : s.head * 0.22,
            left: 0,
            right: 0,
          }}
        >
          <div
            style={{
              width: s.eye * 1.4,
              height: s.eye * 0.35,
              background: `linear-gradient(180deg, ${darkerPrimary}, ${adjustBrightness(darkerPrimary, -20)})`,
              borderRadius: s.eye * 0.2,
              transform: expression === 'angry' ? 'rotate(18deg)' : expression === 'surprised' ? 'rotate(-8deg)' : 'rotate(-3deg)',
              boxShadow: `0 ${s.stroke}px ${s.stroke * 2}px rgba(0,0,0,0.2)`,
            }}
          />
          <div
            style={{
              width: s.eye * 1.4,
              height: s.eye * 0.35,
              background: `linear-gradient(180deg, ${darkerPrimary}, ${adjustBrightness(darkerPrimary, -20)})`,
              borderRadius: s.eye * 0.2,
              transform: expression === 'angry' ? 'rotate(-18deg)' : expression === 'surprised' ? 'rotate(8deg)' : 'rotate(3deg)',
              boxShadow: `0 ${s.stroke}px ${s.stroke * 2}px rgba(0,0,0,0.2)`,
            }}
          />
        </div>

        {/* Mouth */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: s.head,
            height: s.head,
            pointerEvents: 'none',
          }}
        >
          {expression === 'surprised' ? (
            <ellipse
              cx={s.head * 0.5}
              cy={s.head * 0.72}
              rx={s.head * 0.1}
              ry={s.head * 0.12}
              fill="#1a1a2e"
              stroke={darkerPrimary}
              strokeWidth={s.stroke * 0.5}
            />
          ) : expression === 'happy' ? (
            <>
              <path
                d={`M ${s.head * 0.3} ${s.head * 0.65} Q ${s.head * 0.5} ${s.head * 0.85} ${s.head * 0.7} ${s.head * 0.65}`}
                fill="#1a1a2e"
                stroke={darkerPrimary}
                strokeWidth={s.stroke * 0.5}
              />
              {/* Tongue for happy */}
              <ellipse
                cx={s.head * 0.5}
                cy={s.head * 0.73}
                rx={s.head * 0.08}
                ry={s.head * 0.05}
                fill="#FF6B6B"
              />
            </>
          ) : expression === 'angry' ? (
            <path
              d={`M ${s.head * 0.32} ${s.head * 0.7} L ${s.head * 0.68} ${s.head * 0.7}`}
              fill="none"
              stroke="#1a1a2e"
              strokeWidth={s.stroke * 1.5}
              strokeLinecap="round"
            />
          ) : expression === 'wink' ? (
            <path
              d={`M ${s.head * 0.35} ${s.head * 0.7} Q ${s.head * 0.5} ${s.head * 0.78} ${s.head * 0.65} ${s.head * 0.7}`}
              fill="none"
              stroke="#1a1a2e"
              strokeWidth={s.stroke * 1.2}
              strokeLinecap="round"
            />
          ) : (
            <path
              d={`M ${s.head * 0.38} ${s.head * 0.68} Q ${s.head * 0.5} ${s.head * 0.73} ${s.head * 0.62} ${s.head * 0.68}`}
              fill="none"
              stroke="#1a1a2e"
              strokeWidth={s.stroke * 1.2}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Blush for happy expression */}
        {expression === 'happy' && (
          <>
            <div
              style={{
                position: 'absolute',
                width: s.head * 0.18,
                height: s.head * 0.1,
                top: s.head * 0.5,
                left: s.head * 0.08,
                background: 'rgba(255,120,150,0.5)',
                borderRadius: '50%',
                filter: `blur(${s.head * 0.04}px)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: s.head * 0.18,
                height: s.head * 0.1,
                top: s.head * 0.5,
                right: s.head * 0.08,
                background: 'rgba(255,120,150,0.5)',
                borderRadius: '50%',
                filter: `blur(${s.head * 0.04}px)`,
              }}
            />
          </>
        )}

        {/* Accessories */}
        {accessory === 'crown' && (
          <div
            style={{
              position: 'absolute',
              top: -s.head * 0.3,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: s.head * 0.4,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          >
            👑
          </div>
        )}

        {accessory === 'headband' && (
          <div
            style={{
              position: 'absolute',
              top: s.head * 0.05,
              left: '8%',
              right: '8%',
              height: s.head * 0.14,
              background: `linear-gradient(180deg, ${accentColor}, ${adjustBrightness(accentColor, -20)})`,
              borderRadius: s.head * 0.08,
              boxShadow: `0 ${s.stroke}px ${s.stroke * 2}px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Headband knot */}
            <div
              style={{
                position: 'absolute',
                top: s.head * 0.03,
                right: -s.head * 0.02,
                width: s.head * 0.12,
                height: s.head * 0.15,
                background: accentColor,
                borderRadius: '30%',
                transform: 'rotate(30deg)',
              }}
            />
          </div>
        )}

        {accessory === 'bandana' && (
          <div
            style={{
              position: 'absolute',
              top: s.head * 0.02,
              left: '5%',
              right: '5%',
              height: s.head * 0.2,
              background: `linear-gradient(180deg, ${accentColor}, ${adjustBrightness(accentColor, -30)})`,
              borderRadius: `${s.head * 0.5}px ${s.head * 0.5}px ${s.head * 0.1}px ${s.head * 0.1}px`,
              boxShadow: `0 ${s.stroke}px ${s.stroke * 2}px rgba(0,0,0,0.3)`,
            }}
          />
        )}

        {accessory === 'glasses' && (
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              justifyContent: 'center',
              gap: s.head * 0.02,
              top: s.head * 0.3,
              left: 0,
              right: 0,
            }}
          >
            <div
              style={{
                width: s.eye * 1.8,
                height: s.eye * 1.5,
                border: `${s.stroke * 1.2}px solid #1a1a2e`,
                borderRadius: '25%',
                background: 'rgba(0,0,0,0.1)',
              }}
            />
            <div
              style={{
                width: s.eye * 0.3,
                height: s.stroke * 1.5,
                background: '#1a1a2e',
                alignSelf: 'center',
              }}
            />
            <div
              style={{
                width: s.eye * 1.8,
                height: s.eye * 1.5,
                border: `${s.stroke * 1.2}px solid #1a1a2e`,
                borderRadius: '25%',
                background: 'rgba(0,0,0,0.1)',
              }}
            />
          </div>
        )}

        {accessory === 'helmet' && (
          <div
            style={{
              position: 'absolute',
              top: -s.head * 0.08,
              left: '-5%',
              right: '-5%',
              height: s.head * 0.5,
              background: `linear-gradient(180deg, #7C8798, #5C6778)`,
              borderRadius: `${s.head}px ${s.head}px 0 0`,
              boxShadow: `
                inset 0 ${s.head * 0.03}px ${s.head * 0.05}px rgba(255,255,255,0.3),
                0 ${s.stroke * 2}px ${s.stroke * 3}px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Helmet ridge */}
            <div
              style={{
                position: 'absolute',
                top: s.head * 0.05,
                left: '30%',
                right: '30%',
                height: s.head * 0.35,
                background: `linear-gradient(180deg, #8C9AA8, #6C7A88)`,
                borderRadius: `${s.head * 0.5}px ${s.head * 0.5}px 0 0`,
              }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          position: 'relative',
          marginTop: -s.head * 0.12,
          width: s.body,
          height: s.body * 0.75,
          background: `linear-gradient(180deg, ${primaryColor} 0%, ${secondaryColor} 70%, ${adjustBrightness(secondaryColor, -15)} 100%)`,
          borderRadius: `${s.body * 0.45}px ${s.body * 0.45}px ${s.body * 0.4}px ${s.body * 0.4}px`,
          border: `${s.stroke}px solid ${darkerPrimary}`,
          boxShadow: `
            0 ${s.body * 0.1}px ${s.body * 0.15}px rgba(0,0,0,0.35),
            inset 0 ${s.body * 0.03}px ${s.body * 0.06}px rgba(255,255,255,0.2),
            inset 0 -${s.body * 0.05}px ${s.body * 0.08}px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Body highlight */}
        <div
          style={{
            position: 'absolute',
            width: s.body * 0.2,
            height: s.body * 0.35,
            top: s.body * 0.1,
            left: s.body * 0.15,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            filter: `blur(${s.body * 0.04}px)`,
          }}
        />
      </div>
    </Wrapper>
  );
}

// Helper functions
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function lighten(hex: string, percent: number): string {
  return adjustBrightness(hex, Math.abs(percent));
}

// Pre-made character configs
export const CHARACTER_STYLES = {
  warrior: { primary: '#FF3366', secondary: '#CC1144', accent: '#FFE66D', accessory: 'headband' as const },
  mage: { primary: '#6C5CE7', secondary: '#4834D4', accent: '#00D9FF', accessory: 'none' as const },
  tank: { primary: '#00D26A', secondary: '#00A854', accent: '#FFE66D', accessory: 'helmet' as const },
  speedster: { primary: '#00D9FF', secondary: '#0099CC', accent: '#FF3366', accessory: 'glasses' as const },
  royal: { primary: '#FFE66D', secondary: '#FFCC00', accent: '#FF3366', accessory: 'crown' as const },
  ninja: { primary: '#2D3436', secondary: '#1a1a2e', accent: '#FF3366', accessory: 'bandana' as const },
};
