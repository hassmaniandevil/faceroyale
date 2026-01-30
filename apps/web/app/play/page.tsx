'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore, selectIsAuthenticated, selectNeedsCalibration } from '@/stores/playerStore';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { usePracticeGame } from '@/hooks/usePracticeGame';
import { CalibrationFlow } from '@/components/calibration/CalibrationFlow';
import { CHARACTERS } from '@faceroyale/game-core';

type LoadingStep = 'camera' | 'model' | 'calibration' | 'ready' | 'error';

// Expression-based ability triggers
const EXPRESSION_ABILITIES = [
  { key: 'roar', expression: 'mouthOpen', threshold: 0.35, name: 'ROAR', color: '#FF3366', icon: '😮' },
  { key: 'shield', expression: 'browRaise', threshold: 0.3, name: 'SHIELD', color: '#00D9FF', icon: '🤨' },
  { key: 'blast', expression: 'cheekPuff', threshold: 0.3, name: 'BLAST', color: '#FFE66D', icon: '🐡' },
];

// Combo abilities (multiple expressions at once)
const COMBO_ABILITIES = [
  { key: 'fury', expressions: ['mouthOpen', 'browRaise'], threshold: 0.25, name: 'FURY', color: '#FF0066', icon: '😤' },
  { key: 'reflect', expressions: ['cheekPuff', 'browRaise'], threshold: 0.25, name: 'REFLECT', color: '#00FFFF', icon: '🪞' },
  { key: 'megaBlast', expressions: ['mouthOpen', 'cheekPuff'], threshold: 0.25, name: 'MEGA BLAST', color: '#FF00FF', icon: '💥' },
];

// Head movement abilities (using head pose)
const HEAD_ABILITIES = [
  { key: 'dashLeft', direction: 'left', threshold: 0.6, name: 'DASH LEFT', color: '#00D26A', icon: '⬅️' },
  { key: 'dashRight', direction: 'right', threshold: 0.6, name: 'DASH RIGHT', color: '#00D26A', icon: '➡️' },
  { key: 'leap', direction: 'up', threshold: 0.5, name: 'LEAP', color: '#6C5CE7', icon: '⬆️' },
  { key: 'stomp', direction: 'down', threshold: 0.5, name: 'STOMP', color: '#FF6B35', icon: '⬇️' },
];

export default function PlayPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const needsCalibration = usePlayerStore(selectNeedsCalibration);
  const setCalibrationData = usePlayerStore((s) => s.setCalibrationData);
  const { username } = usePlayerStore();

  const {
    videoRef,
    isInitialized,
    initialize,
    startTracking,
    stopTracking,
    expressions,
    headPose,
    quality,
    isContentBlocked,
  } = useFaceTracking();

  const {
    gameState,
    initializeGame,
    updatePlayerMovement,
    triggerAbility,
    resetGame,
    getLocalPlayer,
    localPlayerId,
    ARENA_SIZE,
  } = usePracticeGame();

  const [loadingStep, setLoadingStep] = useState<LoadingStep>('camera');
  const [showCalibration, setShowCalibration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeAbility, setActiveAbility] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initAttempted = useRef(false);
  const lastTriggerTime = useRef<Record<string, number>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Initialize face tracking
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    const init = async () => {
      try {
        setLoadingStep('camera');
        await initialize();
        setLoadingStep('calibration');
      } catch (err: any) {
        console.error('Init error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access and refresh.');
        } else {
          setError('Failed to initialize camera: ' + (err.message || 'Unknown error'));
        }
        setLoadingStep('error');
      }
    };

    init();
  }, [initialize]);

  // Handle calibration flow
  useEffect(() => {
    if (isInitialized && needsCalibration && loadingStep === 'calibration') {
      setShowCalibration(true);
    } else if (isInitialized && !needsCalibration && loadingStep === 'calibration') {
      setLoadingStep('ready');
    }
  }, [isInitialized, needsCalibration, loadingStep]);

  // Start game when ready
  useEffect(() => {
    if (loadingStep === 'ready' && gameState.phase === 'waiting') {
      startTracking();
      setCountdown(3);
    }
  }, [loadingStep, gameState.phase, startTracking]);

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      initializeGame(username || 'Player', CHARACTERS[0]);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, initializeGame, username]);

  // Handle head pose movement
  useEffect(() => {
    if (gameState.phase !== 'playing' || !headPose) return;

    // Use head tilt for movement
    updatePlayerMovement({
      x: headPose.yaw,
      y: headPose.pitch,
    });
  }, [headPose, gameState.phase, updatePlayerMovement]);

  // Handle expression-based ability triggers
  useEffect(() => {
    if (gameState.phase !== 'playing' || !expressions) return;

    const now = Date.now();

    // Check combo abilities first (they have priority)
    for (const combo of COMBO_ABILITIES) {
      const values = combo.expressions.map(
        (exp) => expressions[exp as keyof typeof expressions] as number
      );
      const allActive = values.every((v) => v >= combo.threshold);

      if (allActive) {
        const lastTrigger = lastTriggerTime.current[combo.key] || 0;
        if (now - lastTrigger > 800) { // Longer cooldown for combos
          lastTriggerTime.current[combo.key] = now;
          setActiveAbility(combo.key);
          const avgIntensity = values.reduce((a, b) => a + b, 0) / values.length;
          triggerAbility(combo.key, Math.min(avgIntensity / combo.threshold, 2));
          setTimeout(() => setActiveAbility(null), 400);
          return; // Only trigger one ability per frame
        }
      }
    }

    // Check single expression abilities
    for (const trigger of EXPRESSION_ABILITIES) {
      const value = expressions[trigger.expression as keyof typeof expressions];
      if (typeof value === 'number' && value >= trigger.threshold) {
        const lastTrigger = lastTriggerTime.current[trigger.key] || 0;
        if (now - lastTrigger > 500) {
          lastTriggerTime.current[trigger.key] = now;
          setActiveAbility(trigger.key);
          triggerAbility(trigger.key, Math.min(value / trigger.threshold, 1.5));
          setTimeout(() => setActiveAbility(null), 300);
          return; // Only trigger one ability per frame
        }
      }
    }
  }, [expressions, gameState.phase, triggerAbility]);

  // Handle head movement abilities (dash, leap, stomp)
  useEffect(() => {
    if (gameState.phase !== 'playing' || !headPose) return;

    const now = Date.now();

    for (const ability of HEAD_ABILITIES) {
      let isActive = false;

      switch (ability.direction) {
        case 'left':
          isActive = headPose.yaw < -ability.threshold;
          break;
        case 'right':
          isActive = headPose.yaw > ability.threshold;
          break;
        case 'up':
          isActive = headPose.pitch < -ability.threshold;
          break;
        case 'down':
          isActive = headPose.pitch > ability.threshold;
          break;
      }

      if (isActive) {
        const lastTrigger = lastTriggerTime.current[ability.key] || 0;
        if (now - lastTrigger > 600) {
          lastTriggerTime.current[ability.key] = now;
          setActiveAbility(ability.key);
          triggerAbility(ability.key, 1);
          setTimeout(() => setActiveAbility(null), 300);
          return;
        }
      }
    }
  }, [headPose, gameState.phase, triggerAbility]);

  // Render game canvas
  useEffect(() => {
    if (!canvasRef.current || gameState.phase === 'waiting') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = canvas.width / ARENA_SIZE;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw zone circle
      if (gameState.zone) {
        ctx.beginPath();
        ctx.arc(
          gameState.zone.center.x * scale,
          gameState.zone.center.y * scale,
          gameState.zone.currentRadius * scale,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = '#FF3366';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Zone fill (danger zone outside)
        ctx.fillStyle = 'rgba(255, 51, 102, 0.1)';
        ctx.fill();
      }

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= ARENA_SIZE; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i * scale, 0);
        ctx.lineTo(i * scale, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * scale);
        ctx.lineTo(canvas.width, i * scale);
        ctx.stroke();
      }

      // Draw players
      gameState.players.forEach((player) => {
        if (!player.isAlive) return;

        const x = player.position.x * scale;
        const y = player.position.y * scale;
        const isLocal = player.id === localPlayerId;
        const size = isLocal ? 20 : 16;

        // Player body (bean shape)
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);

        if (isLocal) {
          // Local player gradient
          const gradient = ctx.createRadialGradient(x - size/3, y - size/3, 0, x, y, size * 1.5);
          gradient.addColorStop(0, '#FFE66D');
          gradient.addColorStop(1, '#FFCC00');
          ctx.fillStyle = gradient;
        } else {
          // Bot color based on health
          const healthRatio = player.health / 100;
          ctx.fillStyle = `hsl(${healthRatio * 120}, 70%, 50%)`;
        }
        ctx.fill();

        // Outline
        ctx.strokeStyle = isLocal ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = isLocal ? 3 : 1;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x - size * 0.25, y - size * 0.2, size * 0.2, 0, Math.PI * 2);
        ctx.arc(x + size * 0.25, y - size * 0.2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(x - size * 0.25, y - size * 0.15, size * 0.1, 0, Math.PI * 2);
        ctx.arc(x + size * 0.25, y - size * 0.15, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = size * 2;
        const barHeight = 4;
        const barY = y + size * 1.5;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

        ctx.fillStyle = player.health > 30 ? '#00D26A' : '#FF3366';
        ctx.fillRect(x - barWidth / 2, barY, barWidth * (player.health / 100), barHeight);

        // Name tag for local player
        if (isLocal) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('YOU', x, y - size * 1.5);
        }
      });

      requestAnimationFrame(render);
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, localPlayerId, ARENA_SIZE]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    setLoadingStep('ready');
  };

  const handleCalibrationSkip = () => {
    setCalibrationData({
      browBaseline: 0.08,
      browMaxRaise: 0.15,
      browFurrowBaseline: 0.08,
      browFurrowMin: 0.04,
      mouthClosed: 0.01,
      mouthMaxOpen: 0.12,
      smileBaseline: 0,
      smileMax: 0.05,
      cheekBaseline: 0.15,
      cheekMaxPuff: 0.22,
      timestamp: Date.now(),
    });
    setShowCalibration(false);
    setLoadingStep('ready');
  };

  const handlePlayAgain = () => {
    resetGame();
    setCountdown(3);
  };

  const handleExit = () => {
    stopTracking();
    resetGame();
    router.push('/');
  };

  const localPlayer = getLocalPlayer();

  // Generate player feeds for UI
  const playerFeeds = gameState.players
    .filter((p) => p.isAlive && p.id !== localPlayerId)
    .slice(0, 8);

  // Error screen
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
          <h2 style={{ fontFamily: "'Bangers', cursive", fontSize: '2rem', color: 'white', marginBottom: '1rem' }}>Oops!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>{error}</p>
          <button onClick={() => router.push('/')} style={{ padding: '1rem 2rem', fontSize: '1.25rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FF3366, #6C5CE7)', border: 'none', borderRadius: '100px', color: 'white', cursor: 'pointer' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Calibration
  if (showCalibration) {
    return (
      <CalibrationFlow
        videoRef={videoRef}
        onComplete={handleCalibrationComplete}
        onSkip={handleCalibrationSkip}
      />
    );
  }

  // Loading/Countdown screen
  if (loadingStep !== 'ready' || countdown !== null) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          {countdown !== null ? (
            <div>
              <div style={{ fontSize: '8rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FF3366, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>Get ready to fight!</p>
            </div>
          ) : (
            <>
              <div style={{ width: '60px', height: '60px', border: '4px solid #FF3366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                {loadingStep === 'camera' && 'Requesting camera access...'}
                {loadingStep === 'model' && 'Loading face detection...'}
                {loadingStep === 'calibration' && 'Preparing...'}
              </p>
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Main Game UI - Battle Royale Layout
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#050508', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.5)' }}>
        <button onClick={handleExit} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>
          ✕
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontFamily: "'Bangers', cursive", color: '#FF3366' }}>{gameState.playersAlive}</div>
            <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)' }}>ALIVE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontFamily: "'Bangers', cursive", color: '#FFE66D' }}>{localPlayer?.kills || 0}</div>
            <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)' }}>KILLS</div>
          </div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Main Content - Arena with Video Feeds */}
      <div style={{ flex: 1, display: 'flex', padding: '0.5rem', gap: '0.5rem', minHeight: 0 }}>
        {/* Left Video Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '120px' }}>
          {playerFeeds.slice(0, 4).map((player) => (
            <div key={player.id} style={{ flex: 1, background: `linear-gradient(135deg, hsl(${(player.health / 100) * 120}, 50%, 20%), #0a0a0f)`, borderRadius: '0.5rem', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2rem' }}>🤖</div>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{player.name}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.5)' }}>
                <div style={{ height: '100%', width: `${player.health}%`, background: player.health > 30 ? '#00D26A' : '#FF3366' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Central Arena */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, position: 'relative', borderRadius: '1rem', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.1)' }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0a0a0f' }}
            />

            {/* Ability indicators overlay */}
            <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', right: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {/* Expression abilities */}
              {EXPRESSION_ABILITIES.map((ability) => (
                <div
                  key={ability.key}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: activeAbility === ability.key ? ability.color : 'rgba(0,0,0,0.7)',
                    border: `2px solid ${ability.color}`,
                    color: 'white',
                    fontSize: '0.65rem',
                    fontFamily: "'Bangers', cursive",
                    transition: 'all 0.1s',
                    transform: activeAbility === ability.key ? 'scale(1.15)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>{ability.icon}</span>
                  <span>{ability.name}</span>
                </div>
              ))}
              {/* Combo abilities */}
              {COMBO_ABILITIES.map((ability) => (
                <div
                  key={ability.key}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: activeAbility === ability.key ? ability.color : 'rgba(0,0,0,0.7)',
                    border: `2px solid ${ability.color}`,
                    color: 'white',
                    fontSize: '0.65rem',
                    fontFamily: "'Bangers', cursive",
                    transition: 'all 0.1s',
                    transform: activeAbility === ability.key ? 'scale(1.15)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>{ability.icon}</span>
                  <span>{ability.name}</span>
                </div>
              ))}
              {/* Head movement abilities */}
              {HEAD_ABILITIES.map((ability) => (
                <div
                  key={ability.key}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: activeAbility === ability.key ? ability.color : 'rgba(0,0,0,0.7)',
                    border: `2px solid ${ability.color}`,
                    color: 'white',
                    fontSize: '0.65rem',
                    fontFamily: "'Bangers', cursive",
                    transition: 'all 0.1s',
                    transform: activeAbility === ability.key ? 'scale(1.15)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>{ability.icon}</span>
                  <span>{ability.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Your Camera + Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', borderRadius: '0.75rem' }}>
            {/* Your video feed */}
            <div style={{ width: '120px', height: '90px', borderRadius: '0.5rem', overflow: 'hidden', border: `3px solid ${quality > 0.5 ? '#00D26A' : '#FF3366'}`, position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', filter: isContentBlocked ? 'blur(20px)' : 'none' }}
              />
              {quality > 0 && headPose && (
                <div style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '2px', borderRadius: '4px' }}>
                  Tilt: {headPose.yaw.toFixed(1)}, {headPose.pitch.toFixed(1)}
                </div>
              )}
            </div>

            {/* Health bar */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>HEALTH</div>
              <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${localPlayer?.health || 100}%`, background: (localPlayer?.health || 100) > 30 ? 'linear-gradient(90deg, #00D26A, #00ff88)' : 'linear-gradient(90deg, #FF3366, #ff0066)', transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Controls hint */}
            <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
              <div>😮 Mouth = Roar</div>
              <div>🤨 Brows = Shield</div>
              <div>🐡 Cheeks = Blast</div>
            </div>
          </div>
        </div>

        {/* Right Video Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '120px' }}>
          {playerFeeds.slice(4, 8).map((player) => (
            <div key={player.id} style={{ flex: 1, background: `linear-gradient(135deg, hsl(${(player.health / 100) * 120}, 50%, 20%), #0a0a0f)`, borderRadius: '0.5rem', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2rem' }}>🤖</div>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{player.name}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.5)' }}>
                <div style={{ height: '100%', width: `${player.health}%`, background: player.health > 30 ? '#00D26A' : '#FF3366' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameState.phase === 'ended' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            {gameState.winnerId === localPlayerId ? (
              <>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>👑</div>
                <h1 style={{ fontSize: '3rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FFE66D, #FF3366)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                  VICTORY ROYALE!
                </h1>
              </>
            ) : (
              <>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>💀</div>
                <h1 style={{ fontSize: '3rem', fontFamily: "'Bangers', cursive", color: '#FF3366', marginBottom: '0.5rem' }}>
                  ELIMINATED
                </h1>
              </>
            )}
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
              {localPlayer?.kills || 0} eliminations | #{gameState.winnerId === localPlayerId ? 1 : gameState.playersAlive + 1} placement
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handlePlayAgain} style={{ padding: '1rem 2rem', fontSize: '1.5rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FF3366, #6C5CE7)', border: 'none', borderRadius: '100px', color: 'white', cursor: 'pointer' }}>
                Play Again
              </button>
              <button onClick={handleExit} style={{ padding: '1rem 2rem', fontSize: '1.5rem', fontFamily: "'Bangers', cursive", background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '100px', color: 'white', cursor: 'pointer' }}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content blocked overlay */}
      {isContentBlocked && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h2 style={{ fontFamily: "'Bangers', cursive", fontSize: '2rem', color: '#FF3366', marginBottom: '0.5rem' }}>Content Blocked</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please keep your camera feed appropriate.</p>
          </div>
        </div>
      )}
    </div>
  );
}
