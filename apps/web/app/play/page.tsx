'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore, selectIsAuthenticated, selectNeedsCalibration } from '@/stores/playerStore';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { usePracticeGame } from '@/hooks/usePracticeGame';
import { CalibrationFlow } from '@/components/calibration/CalibrationFlow';
import { CHARACTERS } from '@faceroyale/game-core';

type LoadingStep = 'camera' | 'model' | 'calibration' | 'ready' | 'error';

// Visual effect types
interface VisualEffect {
  id: string;
  type: 'roar' | 'shield' | 'blast' | 'fury' | 'damage' | 'heal' | 'stomp' | 'dash' | 'hit';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  color: string;
  startTime: number;
  duration: number;
  value?: number;
}

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

// Bot face expressions
const BOT_FACES = ['😐', '😠', '😤', '🤨', '😮', '😡', '🙄', '😏', '😈', '🤖'];

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
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [playerExpression, setPlayerExpression] = useState<string>('neutral');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initAttempted = useRef(false);
  const lastTriggerTime = useRef<Record<string, number>>({});
  const botExpressions = useRef<Record<string, string>>({});

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

  // Update player expression based on face tracking
  useEffect(() => {
    if (!expressions) return;

    const mouthOpen = (expressions.mouthOpen as number) || 0;
    const browRaise = (expressions.browRaise as number) || 0;
    const cheekPuff = (expressions.cheekPuff as number) || 0;

    if (mouthOpen > 0.35) {
      setPlayerExpression('roar');
    } else if (browRaise > 0.3) {
      setPlayerExpression('surprised');
    } else if (cheekPuff > 0.3) {
      setPlayerExpression('puff');
    } else {
      setPlayerExpression('neutral');
    }
  }, [expressions]);

  // Add visual effect helper
  const addVisualEffect = useCallback((effect: Omit<VisualEffect, 'id' | 'startTime'>) => {
    const newEffect: VisualEffect = {
      ...effect,
      id: Math.random().toString(36),
      startTime: Date.now(),
    };
    setVisualEffects(prev => [...prev, newEffect]);

    // Screen shake for big attacks
    if (['roar', 'fury', 'megaBlast', 'stomp'].includes(effect.type)) {
      setScreenShake({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 });
      setTimeout(() => setScreenShake({ x: 0, y: 0 }), 100);
    }
  }, []);

  // Clean up expired effects
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setVisualEffects(prev => prev.filter(e => now - e.startTime < e.duration));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Handle head pose movement
  useEffect(() => {
    if (gameState.phase !== 'playing' || !headPose) return;
    updatePlayerMovement({
      x: headPose.yaw,
      y: headPose.pitch,
    });
  }, [headPose, gameState.phase, updatePlayerMovement]);

  // Handle expression-based ability triggers with visual effects
  useEffect(() => {
    if (gameState.phase !== 'playing' || !expressions) return;

    const now = Date.now();
    const localPlayer = getLocalPlayer();
    if (!localPlayer) return;

    const scale = 1; // Will be adjusted in render

    // Check combo abilities first (they have priority)
    for (const combo of COMBO_ABILITIES) {
      const values = combo.expressions.map(
        (exp) => expressions[exp as keyof typeof expressions] as number
      );
      const allActive = values.every((v) => v >= combo.threshold);

      if (allActive) {
        const lastTrigger = lastTriggerTime.current[combo.key] || 0;
        if (now - lastTrigger > 800) {
          lastTriggerTime.current[combo.key] = now;
          setActiveAbility(combo.key);
          const avgIntensity = values.reduce((a, b) => a + b, 0) / values.length;
          triggerAbility(combo.key, Math.min(avgIntensity / combo.threshold, 2));

          // Add visual effect
          addVisualEffect({
            type: combo.key === 'fury' ? 'fury' : 'blast',
            x: localPlayer.position.x,
            y: localPlayer.position.y,
            color: combo.color,
            duration: 600,
          });

          setTimeout(() => setActiveAbility(null), 400);
          return;
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

          // Add visual effect based on ability
          if (trigger.key === 'roar') {
            addVisualEffect({
              type: 'roar',
              x: localPlayer.position.x,
              y: localPlayer.position.y,
              color: trigger.color,
              duration: 500,
            });
          } else if (trigger.key === 'shield') {
            addVisualEffect({
              type: 'shield',
              x: localPlayer.position.x,
              y: localPlayer.position.y,
              color: trigger.color,
              duration: 800,
            });
          } else if (trigger.key === 'blast') {
            addVisualEffect({
              type: 'blast',
              x: localPlayer.position.x,
              y: localPlayer.position.y,
              color: trigger.color,
              duration: 400,
            });
          }

          setTimeout(() => setActiveAbility(null), 300);
          return;
        }
      }
    }
  }, [expressions, gameState.phase, triggerAbility, getLocalPlayer, addVisualEffect]);

  // Handle head movement abilities
  useEffect(() => {
    if (gameState.phase !== 'playing' || !headPose) return;

    const now = Date.now();
    const localPlayer = getLocalPlayer();
    if (!localPlayer) return;

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

          // Add dash effect
          if (ability.key.includes('dash')) {
            addVisualEffect({
              type: 'dash',
              x: localPlayer.position.x,
              y: localPlayer.position.y,
              color: ability.color,
              duration: 300,
            });
          } else if (ability.key === 'stomp') {
            addVisualEffect({
              type: 'stomp',
              x: localPlayer.position.x,
              y: localPlayer.position.y,
              color: ability.color,
              duration: 500,
            });
          }

          setTimeout(() => setActiveAbility(null), 300);
          return;
        }
      }
    }
  }, [headPose, gameState.phase, triggerAbility, getLocalPlayer, addVisualEffect]);

  // Update bot expressions randomly
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const interval = setInterval(() => {
      gameState.players.forEach(player => {
        if (player.isBot && player.isAlive) {
          // Random chance to change expression
          if (Math.random() < 0.1) {
            botExpressions.current[player.id] = BOT_FACES[Math.floor(Math.random() * BOT_FACES.length)];
          }
        }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [gameState.phase, gameState.players]);

  // Render game canvas with better visuals
  useEffect(() => {
    if (!canvasRef.current || gameState.phase === 'waiting') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear with gradient background
      const bgGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = canvas.width / ARENA_SIZE;

      // Draw hex grid pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      const hexSize = 40;
      for (let row = 0; row < canvas.height / hexSize + 1; row++) {
        for (let col = 0; col < canvas.width / hexSize + 1; col++) {
          const x = col * hexSize * 1.5 + (row % 2) * hexSize * 0.75;
          const y = row * hexSize * 0.866;
          drawHexagon(ctx, x, y, hexSize / 2);
        }
      }

      // Draw zone circle with glow
      if (gameState.zone) {
        const zoneX = gameState.zone.center.x * scale;
        const zoneY = gameState.zone.center.y * scale;
        const zoneR = gameState.zone.currentRadius * scale;

        // Danger zone outside (red overlay)
        ctx.fillStyle = 'rgba(255, 51, 102, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear safe zone
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Zone border with glow
        ctx.shadowColor = '#FF3366';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF3366';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Pulsing inner ring
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(zoneX, zoneY, zoneR - 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 51, 102, ${0.3 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw visual effects
      const now = Date.now();
      visualEffects.forEach(effect => {
        const progress = (now - effect.startTime) / effect.duration;
        const effectX = effect.x * scale;
        const effectY = effect.y * scale;

        ctx.save();
        ctx.globalAlpha = 1 - progress;

        switch (effect.type) {
          case 'roar':
            // Expanding cone/wave
            const roarRadius = 60 + progress * 100;
            const gradient = ctx.createRadialGradient(effectX, effectY, 0, effectX, effectY, roarRadius * scale / ARENA_SIZE * canvas.width);
            gradient.addColorStop(0, 'rgba(255, 51, 102, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 51, 102, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 51, 102, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effectX, effectY, roarRadius * scale / ARENA_SIZE * canvas.width, 0, Math.PI * 2);
            ctx.fill();

            // Sound wave rings
            for (let i = 0; i < 3; i++) {
              const ringProgress = (progress + i * 0.2) % 1;
              ctx.beginPath();
              ctx.arc(effectX, effectY, ringProgress * 80 * scale / ARENA_SIZE * canvas.width, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 51, 102, ${(1 - ringProgress) * 0.5})`;
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            break;

          case 'shield':
            // Hexagonal shield
            const shieldSize = 35 * scale / ARENA_SIZE * canvas.width;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 4;
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 15;
            drawHexagon(ctx, effectX, effectY, shieldSize * (1 + progress * 0.2));
            ctx.stroke();
            break;

          case 'blast':
            // Expanding ring explosion
            const blastRadius = progress * 100 * scale / ARENA_SIZE * canvas.width;
            ctx.beginPath();
            ctx.arc(effectX, effectY, blastRadius, 0, Math.PI * 2);
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 8 * (1 - progress);
            ctx.stroke();

            // Particles
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const px = effectX + Math.cos(angle) * blastRadius;
              const py = effectY + Math.sin(angle) * blastRadius;
              ctx.beginPath();
              ctx.arc(px, py, 5 * (1 - progress), 0, Math.PI * 2);
              ctx.fillStyle = effect.color;
              ctx.fill();
            }
            break;

          case 'fury':
            // Fiery aura
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2 + Date.now() / 100;
              const dist = 30 + Math.sin(Date.now() / 50 + i) * 10;
              const px = effectX + Math.cos(angle) * dist * scale / ARENA_SIZE * canvas.width;
              const py = effectY + Math.sin(angle) * dist * scale / ARENA_SIZE * canvas.width;
              ctx.beginPath();
              ctx.arc(px, py, 8 * (1 - progress), 0, Math.PI * 2);
              ctx.fillStyle = i % 2 === 0 ? '#FF0066' : '#FF6600';
              ctx.fill();
            }
            break;

          case 'stomp':
            // Ground impact waves
            const stompRadius = progress * 60 * scale / ARENA_SIZE * canvas.width;
            ctx.beginPath();
            ctx.arc(effectX, effectY, stompRadius, 0, Math.PI * 2);
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 6 * (1 - progress);
            ctx.stroke();

            // Cracks
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(effectX, effectY);
              ctx.lineTo(
                effectX + Math.cos(angle) * stompRadius * 1.5,
                effectY + Math.sin(angle) * stompRadius * 1.5
              );
              ctx.strokeStyle = `rgba(255, 107, 53, ${0.5 * (1 - progress)})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;

          case 'dash':
            // Speed lines
            for (let i = 0; i < 5; i++) {
              const lineY = effectY + (i - 2) * 8;
              ctx.beginPath();
              ctx.moveTo(effectX - 30 * (1 - progress), lineY);
              ctx.lineTo(effectX + 30 * progress, lineY);
              ctx.strokeStyle = `rgba(0, 210, 106, ${0.8 * (1 - progress)})`;
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            break;

          case 'hit':
          case 'damage':
            // Damage number
            ctx.font = `bold ${24 * (1 - progress * 0.5)}px Bangers, cursive`;
            ctx.fillStyle = '#FF3366';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            const damageY = effectY - progress * 40;
            ctx.strokeText(`-${effect.value || 0}`, effectX, damageY);
            ctx.fillText(`-${effect.value || 0}`, effectX, damageY);
            break;
        }

        ctx.restore();
      });

      // Draw players with character faces
      gameState.players.forEach((player) => {
        if (!player.isAlive) return;

        const x = player.position.x * scale;
        const y = player.position.y * scale;
        const isLocal = player.id === localPlayerId;
        const size = isLocal ? 28 : 22;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + size, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body glow for local player
        if (isLocal) {
          ctx.shadowColor = '#FFE66D';
          ctx.shadowBlur = 20;
        }

        // Character body (circle/face shape)
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);

        if (isLocal) {
          // Local player - golden gradient
          const gradient = ctx.createRadialGradient(x - size/3, y - size/3, 0, x, y, size);
          gradient.addColorStop(0, '#FFE66D');
          gradient.addColorStop(0.7, '#FFCC00');
          gradient.addColorStop(1, '#FF9900');
          ctx.fillStyle = gradient;
        } else {
          // Bot - color based on character
          const hue = (parseInt(player.id.replace('bot_', '')) * 37) % 360;
          const gradient = ctx.createRadialGradient(x - size/3, y - size/3, 0, x, y, size);
          gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
          gradient.addColorStop(1, `hsl(${hue}, 60%, 40%)`);
          ctx.fillStyle = gradient;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Outline
        ctx.strokeStyle = isLocal ? '#FFFFFF' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isLocal ? 3 : 2;
        ctx.stroke();

        // Draw face based on expression
        const faceExpression = isLocal ? playerExpression : (botExpressions.current[player.id] || '😐');

        // Eyes
        const eyeSize = size * 0.18;
        const eyeY = y - size * 0.1;
        const eyeSpacing = size * 0.35;

        // Eye whites
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(x - eyeSpacing, eyeY, eyeSize * 1.2, eyeSize, 0, 0, Math.PI * 2);
        ctx.ellipse(x + eyeSpacing, eyeY, eyeSize * 1.2, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils - move based on expression
        ctx.fillStyle = '#1a1a2e';
        let pupilOffsetY = 0;
        if (faceExpression === 'surprised' || faceExpression === '😮' || faceExpression === '😠') {
          pupilOffsetY = -eyeSize * 0.2;
        }
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, eyeY + pupilOffsetY, eyeSize * 0.6, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing, eyeY + pupilOffsetY, eyeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows based on expression
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        if (faceExpression === 'roar' || faceExpression === '😠' || faceExpression === '😤' || faceExpression === '😡') {
          // Angry eyebrows
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize * 1.5);
          ctx.lineTo(x - eyeSpacing + eyeSize, eyeY - eyeSize * 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing + eyeSize, eyeY - eyeSize * 1.5);
          ctx.lineTo(x + eyeSpacing - eyeSize, eyeY - eyeSize * 0.8);
          ctx.stroke();
        } else if (faceExpression === 'surprised' || faceExpression === '🤨') {
          // Raised eyebrows
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize * 1.8);
          ctx.lineTo(x - eyeSpacing + eyeSize, eyeY - eyeSize * 1.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing - eyeSize, eyeY - eyeSize * 1.8);
          ctx.lineTo(x + eyeSpacing + eyeSize, eyeY - eyeSize * 1.8);
          ctx.stroke();
        }

        // Mouth based on expression
        const mouthY = y + size * 0.35;

        if (faceExpression === 'roar' || faceExpression === '😮' || faceExpression === '😠') {
          // Open mouth - screaming
          ctx.fillStyle = '#8B0000';
          ctx.beginPath();
          ctx.ellipse(x, mouthY, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FF6B6B';
          ctx.beginPath();
          ctx.ellipse(x, mouthY + size * 0.08, size * 0.15, size * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (faceExpression === 'puff' || faceExpression === '🐡') {
          // Puffed cheeks
          const cheekHue = isLocal ? 45 : (parseInt(player.id.replace('bot_', '')) * 37) % 360;
          ctx.fillStyle = `hsl(${cheekHue}, 70%, 70%)`;
          ctx.beginPath();
          ctx.arc(x - size * 0.5, mouthY - size * 0.1, size * 0.2, 0, Math.PI * 2);
          ctx.arc(x + size * 0.5, mouthY - size * 0.1, size * 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Small mouth
          ctx.fillStyle = '#8B0000';
          ctx.beginPath();
          ctx.ellipse(x, mouthY, size * 0.1, size * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (faceExpression === '😤' || faceExpression === '😡') {
          // Gritting teeth
          ctx.fillStyle = '#8B0000';
          ctx.beginPath();
          ctx.rect(x - size * 0.25, mouthY - size * 0.08, size * 0.5, size * 0.16);
          ctx.fill();
          ctx.fillStyle = 'white';
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(x - size * 0.2 + i * size * 0.12, mouthY - size * 0.06, size * 0.08, size * 0.12);
          }
        } else {
          // Neutral/slight smile
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, mouthY - size * 0.1, size * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }

        // Health bar
        const barWidth = size * 2.5;
        const barHeight = 6;
        const barY = y + size + 8;

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, barY, barWidth, barHeight, 3);
        ctx.fill();

        // Health fill
        const healthPercent = player.health / 100;
        const healthGradient = ctx.createLinearGradient(x - barWidth / 2, 0, x + barWidth / 2, 0);
        if (healthPercent > 0.5) {
          healthGradient.addColorStop(0, '#00D26A');
          healthGradient.addColorStop(1, '#00FF88');
        } else if (healthPercent > 0.25) {
          healthGradient.addColorStop(0, '#FFE66D');
          healthGradient.addColorStop(1, '#FFAA00');
        } else {
          healthGradient.addColorStop(0, '#FF3366');
          healthGradient.addColorStop(1, '#FF0033');
        }
        ctx.fillStyle = healthGradient;
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight, 3);
        ctx.fill();

        // Shield bar (if any)
        if (player.shield > 0) {
          ctx.fillStyle = '#00D9FF';
          ctx.beginPath();
          ctx.roundRect(x - barWidth / 2, barY - 4, barWidth * (player.shield / 50), 3, 1);
          ctx.fill();
        }

        // Name tag
        ctx.fillStyle = 'white';
        ctx.font = `bold ${isLocal ? 11 : 9}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(isLocal ? 'YOU' : player.name, x, y - size - 6);
      });

      requestAnimationFrame(render);
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, localPlayerId, ARENA_SIZE, visualEffects, playerExpression]);

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
    setVisualEffects([]);
    setCountdown(3);
  };

  const handleExit = () => {
    stopTracking();
    resetGame();
    router.push('/');
  };

  const localPlayer = getLocalPlayer();

  // Get alive bots for side panels
  const aliveBots = gameState.players.filter(p => p.isBot && p.isAlive).slice(0, 8);

  // Error screen
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          {countdown !== null ? (
            <div>
              <div style={{ fontSize: '10rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FF3366, #FFE66D, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 60px rgba(255,51,102,0.5)' }}>
                {countdown > 0 ? countdown : 'FIGHT!'}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem', fontSize: '1.25rem' }}>Make faces to attack!</p>
            </div>
          ) : (
            <>
              <div style={{ width: '80px', height: '80px', border: '4px solid #FF3366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem' }}>
                {loadingStep === 'camera' && 'Requesting camera access...'}
                {loadingStep === 'model' && 'Loading face detection...'}
                {loadingStep === 'calibration' && 'Preparing arena...'}
              </p>
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Main Game UI
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button onClick={handleExit} style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
          color: 'white',
          fontSize: '1.25rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}>
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontFamily: "'Bangers', cursive", color: '#FF3366' }}>{gameState.playersAlive}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>ALIVE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontFamily: "'Bangers', cursive", color: '#FFE66D' }}>{localPlayer?.kills || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>KILLS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontFamily: "'Bangers', cursive", color: '#00D9FF' }}>{Math.floor(gameState.timeElapsed)}s</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>TIME</div>
          </div>
        </div>

        <div style={{ width: '44px' }} />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', padding: '1rem', gap: '1rem', minHeight: 0 }}>
        {/* Left Panel - Bot Faces */}
        <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {aliveBots.slice(0, 4).map((player) => (
            <BotFaceCard
              key={player.id}
              player={player}
              expression={botExpressions.current[player.id] || '😐'}
            />
          ))}
        </div>

        {/* Central Arena */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            flex: 1,
            position: 'relative',
            borderRadius: '1rem',
            overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)',
          }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

            {/* Kill feed */}
            <div style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              maxWidth: '200px',
            }}>
              {gameState.killFeed.slice(-5).reverse().map((kill, i) => (
                <div
                  key={kill.timestamp + i}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'rgba(0,0,0,0.8)',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
                    color: 'white',
                    border: kill.killerId === localPlayerId ? '1px solid #FFE66D' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span style={{ color: kill.killerId === localPlayerId ? '#FFE66D' : '#FF3366' }}>{kill.killerName}</span>
                  {' '}☠️{' '}
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{kill.victimName}</span>
                </div>
              ))}
            </div>

            {/* Active ability indicator */}
            {activeAbility && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '0.75rem 1.5rem',
                background: 'rgba(0,0,0,0.9)',
                borderRadius: '1rem',
                border: `3px solid ${[...EXPRESSION_ABILITIES, ...COMBO_ABILITIES, ...HEAD_ABILITIES].find(a => a.key === activeAbility)?.color || '#FF3366'}`,
                animation: 'pulse 0.3s ease-out',
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontFamily: "'Bangers', cursive",
                  color: [...EXPRESSION_ABILITIES, ...COMBO_ABILITIES, ...HEAD_ABILITIES].find(a => a.key === activeAbility)?.color || '#FF3366',
                  textAlign: 'center',
                }}>
                  {[...EXPRESSION_ABILITIES, ...COMBO_ABILITIES, ...HEAD_ABILITIES].find(a => a.key === activeAbility)?.icon}{' '}
                  {[...EXPRESSION_ABILITIES, ...COMBO_ABILITIES, ...HEAD_ABILITIES].find(a => a.key === activeAbility)?.name}
                </div>
              </div>
            )}
          </div>

          {/* Your Camera + Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '1rem',
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* Your video feed */}
            <div style={{
              width: '160px',
              height: '120px',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              border: `4px solid ${quality > 0.5 ? '#00D26A' : '#FF3366'}`,
              position: 'relative',
              boxShadow: `0 0 20px ${quality > 0.5 ? 'rgba(0,210,106,0.3)' : 'rgba(255,51,102,0.3)'}`,
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', filter: isContentBlocked ? 'blur(20px)' : 'none' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '0.5rem',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                fontSize: '0.7rem',
                color: 'white',
                textAlign: 'center',
                fontFamily: "'Bangers', cursive",
              }}>
                {playerExpression === 'roar' && '😮 ROARING!'}
                {playerExpression === 'surprised' && '🤨 BROWS UP!'}
                {playerExpression === 'puff' && '🐡 PUFFING!'}
                {playerExpression === 'neutral' && 'READY'}
              </div>
            </div>

            {/* Health and shield */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>HEALTH</span>
                  <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>{localPlayer?.health || 0}/100</span>
                </div>
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${localPlayer?.health || 0}%`,
                    background: (localPlayer?.health || 100) > 50 ? 'linear-gradient(90deg, #00D26A, #00ff88)' : (localPlayer?.health || 100) > 25 ? 'linear-gradient(90deg, #FFE66D, #FFAA00)' : 'linear-gradient(90deg, #FF3366, #ff0066)',
                    transition: 'width 0.3s',
                    boxShadow: '0 0 10px rgba(0,210,106,0.5)',
                  }} />
                </div>
              </div>
              {(localPlayer?.shield || 0) > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>SHIELD</span>
                    <span style={{ fontSize: '0.75rem', color: '#00D9FF', fontWeight: 'bold' }}>{localPlayer?.shield || 0}</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${((localPlayer?.shield || 0) / 50) * 100}%`,
                      background: 'linear-gradient(90deg, #00D9FF, #00FFFF)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Ability hints */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              justifyContent: 'center',
              padding: '0 1rem',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}>
              {EXPRESSION_ABILITIES.map((ability) => (
                <div
                  key={ability.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: activeAbility === ability.key ? 1 : 0.6,
                    transform: activeAbility === ability.key ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{ability.icon}</span>
                  <span style={{ fontSize: '0.7rem', color: ability.color, fontFamily: "'Bangers', cursive" }}>{ability.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Bot Faces */}
        <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {aliveBots.slice(4, 8).map((player) => (
            <BotFaceCard
              key={player.id}
              player={player}
              expression={botExpressions.current[player.id] || '😐'}
            />
          ))}
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameState.phase === 'ended' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            {gameState.winnerId === localPlayerId ? (
              <>
                <div style={{ fontSize: '6rem', marginBottom: '1rem', animation: 'bounce 1s ease infinite' }}>👑</div>
                <h1 style={{ fontSize: '4rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FFE66D, #FF3366)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                  VICTORY ROYALE!
                </h1>
              </>
            ) : (
              <>
                <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>💀</div>
                <h1 style={{ fontSize: '4rem', fontFamily: "'Bangers', cursive", color: '#FF3366', marginBottom: '0.5rem' }}>
                  ELIMINATED
                </h1>
              </>
            )}
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '1.25rem' }}>
              {localPlayer?.kills || 0} eliminations | #{gameState.winnerId === localPlayerId ? 1 : gameState.playersAlive + 1} placement
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handlePlayAgain} style={{ padding: '1rem 2.5rem', fontSize: '1.5rem', fontFamily: "'Bangers', cursive", background: 'linear-gradient(135deg, #FF3366, #6C5CE7)', border: 'none', borderRadius: '100px', color: 'white', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,51,102,0.4)' }}>
                Play Again
              </button>
              <button onClick={handleExit} style={{ padding: '1rem 2.5rem', fontSize: '1.5rem', fontFamily: "'Bangers', cursive", background: 'transparent', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '100px', color: 'white', cursor: 'pointer' }}>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.1); } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
      `}</style>
    </div>
  );
}

// Bot face card component
function BotFaceCard({ player, expression }: { player: any; expression: string }) {
  const hue = (parseInt(player.id.replace('bot_', '')) * 37) % 360;

  return (
    <div style={{
      flex: 1,
      minHeight: '80px',
      background: `linear-gradient(135deg, hsl(${hue}, 40%, 15%), #0a0a0f)`,
      borderRadius: '0.75rem',
      border: '2px solid rgba(255,255,255,0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '0.5rem',
    }}>
      {/* Character face */}
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${hue}, 60%, 35%))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.75rem',
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: `0 0 15px hsla(${hue}, 70%, 50%, 0.3)`,
      }}>
        {expression}
      </div>

      {/* Name */}
      <div style={{
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.8)',
        marginTop: '0.35rem',
        fontWeight: 'bold',
      }}>
        {player.name}
      </div>

      {/* Health bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(0,0,0,0.5)'
      }}>
        <div style={{
          height: '100%',
          width: `${player.health}%`,
          background: player.health > 50 ? '#00D26A' : player.health > 25 ? '#FFE66D' : '#FF3366',
          transition: 'width 0.3s, background 0.3s',
        }} />
      </div>
    </div>
  );
}

// Helper function to draw hexagons
function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const hx = x + Math.cos(angle) * size;
    const hy = y + Math.sin(angle) * size;
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();
}
