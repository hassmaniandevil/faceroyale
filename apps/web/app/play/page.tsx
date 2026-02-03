'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';

// MediaPipe Face Mesh landmark indices
const LANDMARKS = {
  leftBrowInner: 107,
  rightBrowInner: 336,
  foreheadTop: 10,
  lipTop: 13,
  lipBottom: 14,
  lipLeft: 61,
  lipRight: 291,
  leftCheek: 234,
  rightCheek: 454,
  noseTip: 4,
  chin: 152,
};

type Expression = 'mouthOpen' | 'browRaise' | 'cheekPuff' | 'headLeft' | 'headRight';

interface Fighter {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  x: number;
  y: number;
  color: string;
  isPlayer: boolean;
  isAlive: boolean;
  targetId: string | null;
  anim: string;
  lastAttack: number;
  kills: number;
}

interface HitEffect {
  id: string;
  damage: number;
  x: number;
  y: number;
  targetId: string;
}

interface KillFeed {
  id: string;
  killer: string;
  victim: string;
  timestamp: number;
}

const FIGHTER_NAMES = [
  'BLAZE', 'VIPER', 'STORM', 'FROST', 'SHADOW',
  'TITAN', 'PHOENIX', 'RAZOR', 'NOVA'
];

const FIGHTER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
];

declare const FaceMesh: any;

export default function PlayPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { username } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<'loading' | 'countdown' | 'fighting' | 'victory' | 'defeated'>('loading');
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'good' | 'no_face' | 'too_far' | 'too_close'>('no_face');
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeed[]>([]);
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [playerKills, setPlayerKills] = useState(0);
  const [placement, setPlacement] = useState(10);

  const lastExpressionTime = useRef<Record<string, number>>({});
  const fightersRef = useRef<Fighter[]>([]);
  const phaseRef = useRef(phase);

  // Keep refs in sync
  useEffect(() => {
    fightersRef.current = fighters;
  }, [fighters]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Initialize fighters
  const initializeFighters = useCallback(() => {
    const newFighters: Fighter[] = [];
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    // Player
    newFighters.push({
      id: 'player',
      name: username || 'YOU',
      health: 100,
      maxHealth: 100,
      x: centerX,
      y: centerY,
      color: '#FFE66D',
      isPlayer: true,
      isAlive: true,
      targetId: null,
      anim: 'idle',
      lastAttack: 0,
      kills: 0,
    });

    // 9 CPU fighters in a circle
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      newFighters.push({
        id: `cpu_${i}`,
        name: FIGHTER_NAMES[i],
        health: 100,
        maxHealth: 100,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: FIGHTER_COLORS[i],
        isPlayer: false,
        isAlive: true,
        targetId: null,
        anim: 'idle',
        lastAttack: 0,
        kills: 0,
      });
    }

    setFighters(newFighters);
    fightersRef.current = newFighters;
  }, [username]);

  // Load MediaPipe FaceMesh
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
    script.async = true;
    script.onload = () => {
      console.log('[FaceRoyale] MediaPipe loaded');
      initializeGame();
    };
    script.onerror = () => {
      setError('Failed to load face detection. Please refresh.');
    };
    document.head.appendChild(script);

    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (faceMeshRef.current) faceMeshRef.current.close();
  };

  const initializeGame = async () => {
    try {
      console.log('[FaceRoyale] Requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      console.log('[FaceRoyale] Initializing FaceMesh...');
      faceMeshRef.current = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMeshRef.current.onResults(processResults);
      await faceMeshRef.current.initialize();

      console.log('[FaceRoyale] Ready!');
      initializeFighters();
      startCountdown();

    } catch (err: any) {
      console.error('[FaceRoyale] Init error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera and refresh.');
      } else {
        setError('Failed to initialize: ' + err.message);
      }
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    let count = 3;

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        setCountdown(0);
        clearInterval(countInterval);
        setTimeout(() => {
          setCountdown(null);
          setPhase('fighting');
          startFaceTracking();
          startGameLoop();
        }, 500);
      }
    }, 1000);
  };

  const startFaceTracking = () => {
    const processFrame = async () => {
      if (videoRef.current && faceMeshRef.current && phaseRef.current === 'fighting') {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (e) {}
      }
      animationRef.current = requestAnimationFrame(processFrame);
    };
    processFrame();
  };

  const processResults = (results: any) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setFaceStatus('no_face');
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const faceHeight = Math.abs(landmarks[LANDMARKS.chin].y - landmarks[LANDMARKS.foreheadTop].y);
    const faceWidth = Math.abs(landmarks[LANDMARKS.rightCheek].x - landmarks[LANDMARKS.leftCheek].x);
    const faceSize = (faceHeight + faceWidth) / 2;

    if (faceSize < 0.15) setFaceStatus('too_far');
    else if (faceSize > 0.5) setFaceStatus('too_close');
    else setFaceStatus('good');

    const expressions = calculateExpressions(landmarks);
    if (phaseRef.current === 'fighting') {
      checkExpressionTriggers(expressions);
    }
  };

  const calculateExpressions = (landmarks: any[]) => {
    const expressions: Record<Expression, number> = {
      mouthOpen: 0, browRaise: 0, cheekPuff: 0, headLeft: 0, headRight: 0,
    };

    const mouthOpen = getDistance(landmarks[LANDMARKS.lipTop], landmarks[LANDMARKS.lipBottom]);
    expressions.mouthOpen = Math.max(0, Math.min(1, mouthOpen * 20));

    const leftBrow = getDistance(landmarks[LANDMARKS.leftBrowInner], landmarks[LANDMARKS.foreheadTop]);
    const rightBrow = getDistance(landmarks[LANDMARKS.rightBrowInner], landmarks[LANDMARKS.foreheadTop]);
    expressions.browRaise = Math.max(0, Math.min(1, (0.08 - (leftBrow + rightBrow) / 2) * 10 + 0.5));

    const cheekDistance = getDistance(landmarks[LANDMARKS.leftCheek], landmarks[LANDMARKS.rightCheek]);
    expressions.cheekPuff = Math.max(0, Math.min(1, (cheekDistance - 0.32) * 8));

    const noseX = landmarks[LANDMARKS.noseTip].x;
    const leftCheekX = landmarks[LANDMARKS.leftCheek].x;
    const rightCheekX = landmarks[LANDMARKS.rightCheek].x;
    const turnRatio = ((noseX - leftCheekX) - (rightCheekX - noseX)) / ((noseX - leftCheekX) + (rightCheekX - noseX));

    if (turnRatio > 0.15) expressions.headRight = Math.min(1, turnRatio * 3);
    else if (turnRatio < -0.15) expressions.headLeft = Math.min(1, Math.abs(turnRatio) * 3);

    return expressions;
  };

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const checkExpressionTriggers = (expressions: Record<Expression, number>) => {
    const now = Date.now();
    const cooldown = 500;

    if (expressions.mouthOpen > 0.5) {
      if (now - (lastExpressionTime.current.mouthOpen || 0) > cooldown) {
        lastExpressionTime.current.mouthOpen = now;
        playerAttack('ROAR', 18, 150);
      }
    }

    if (expressions.browRaise > 0.6) {
      if (now - (lastExpressionTime.current.browRaise || 0) > cooldown * 1.5) {
        lastExpressionTime.current.browRaise = now;
        playerShield();
      }
    }

    if (expressions.cheekPuff > 0.4) {
      if (now - (lastExpressionTime.current.cheekPuff || 0) > cooldown) {
        lastExpressionTime.current.cheekPuff = now;
        playerAttack('BLAST', 15, 200);
      }
    }

    if (expressions.headLeft > 0.5 || expressions.headRight > 0.5) {
      if (now - (lastExpressionTime.current.dodge || 0) > cooldown * 0.6) {
        lastExpressionTime.current.dodge = now;
        playerMove(expressions.headLeft > expressions.headRight ? -40 : 40, 0);
      }
    }
  };

  const playerAttack = (moveName: string, damage: number, range: number) => {
    setActiveMove(moveName);
    setTimeout(() => setActiveMove(null), 300);

    setFighters(prev => {
      const player = prev.find(f => f.isPlayer);
      if (!player || !player.isAlive) return prev;

      const updated = prev.map(f => {
        if (f.isPlayer || !f.isAlive) return { ...f, anim: f.isPlayer ? 'attacking' : f.anim };

        const dist = Math.sqrt(Math.pow(f.x - player.x, 2) + Math.pow(f.y - player.y, 2));
        if (dist <= range) {
          const newHealth = Math.max(0, f.health - damage);
          addHitEffect(damage, f.x, f.y, f.id);

          if (newHealth <= 0) {
            addKillFeed(player.name, f.name);
            setPlayerKills(k => k + 1);
          }

          return { ...f, health: newHealth, isAlive: newHealth > 0, anim: 'hurt' };
        }
        return f;
      });

      // Reset player anim after delay
      setTimeout(() => {
        setFighters(p => p.map(f => f.isPlayer ? { ...f, anim: 'idle' } : f));
      }, 200);

      return updated;
    });
  };

  const playerShield = () => {
    setActiveMove('SHIELD');
    setFighters(prev => prev.map(f => f.isPlayer ? { ...f, anim: 'blocking' } : f));
    setTimeout(() => {
      setActiveMove(null);
      setFighters(prev => prev.map(f => f.isPlayer ? { ...f, anim: 'idle' } : f));
    }, 600);
  };

  const playerMove = (dx: number, dy: number) => {
    setFighters(prev => prev.map(f => {
      if (!f.isPlayer) return f;
      return {
        ...f,
        x: Math.max(50, Math.min(750, f.x + dx)),
        y: Math.max(50, Math.min(550, f.y + dy)),
      };
    }));
  };

  const addHitEffect = (damage: number, x: number, y: number, targetId: string) => {
    const effect: HitEffect = { id: Math.random().toString(36), damage, x, y, targetId };
    setHitEffects(prev => [...prev, effect]);
    setTimeout(() => setHitEffects(prev => prev.filter(e => e.id !== effect.id)), 600);
  };

  const addKillFeed = (killer: string, victim: string) => {
    const entry: KillFeed = { id: Math.random().toString(36), killer, victim, timestamp: Date.now() };
    setKillFeed(prev => [entry, ...prev].slice(0, 5));
  };

  // CPU AI and game loop
  const startGameLoop = () => {
    let lastTime = 0;

    const loop = (time: number) => {
      if (phaseRef.current !== 'fighting') return;

      const delta = time - lastTime;
      if (delta > 100) { // ~10fps for AI
        lastTime = time;
        updateCPUFighters();
        checkGameEnd();
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const updateCPUFighters = () => {
    const now = Date.now();

    setFighters(prev => {
      const aliveFighters = prev.filter(f => f.isAlive);
      if (aliveFighters.length <= 1) return prev;

      return prev.map(fighter => {
        if (!fighter.isAlive || fighter.isPlayer) return fighter;

        // Find nearest target
        let nearestTarget: Fighter | null = null;
        let nearestDist = Infinity;

        for (const other of aliveFighters) {
          if (other.id === fighter.id) continue;
          const dist = Math.sqrt(Math.pow(other.x - fighter.x, 2) + Math.pow(other.y - fighter.y, 2));
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestTarget = other;
          }
        }

        if (!nearestTarget) return fighter;
        const target: Fighter = nearestTarget;

        let newX = fighter.x;
        let newY = fighter.y;
        let newAnim = fighter.anim;
        let didAttack = false;

        // Move towards target
        const dx = target.x - fighter.x;
        const dy = target.y - fighter.y;
        const moveSpeed = 2 + Math.random() * 2;

        if (nearestDist > 80) {
          newX += (dx / nearestDist) * moveSpeed;
          newY += (dy / nearestDist) * moveSpeed;
        }

        // Attack if close enough and cooldown passed
        if (nearestDist <= 100 && now - fighter.lastAttack > 800 + Math.random() * 600) {
          didAttack = true;
          newAnim = 'attacking';

          // Deal damage to target
          const damage = 8 + Math.floor(Math.random() * 8);
          const attackTarget = target;

          setTimeout(() => {
            setFighters(p => {
              return p.map(f => {
                if (f.id !== attackTarget.id || !f.isAlive) return f;

                // Check if target is blocking (player only)
                if (f.isPlayer && f.anim === 'blocking') {
                  addHitEffect(Math.round(damage * 0.2), f.x, f.y, f.id);
                  return { ...f, health: Math.max(0, f.health - damage * 0.2) };
                }

                const newHealth = Math.max(0, f.health - damage);
                addHitEffect(damage, f.x, f.y, f.id);

                if (newHealth <= 0) {
                  addKillFeed(fighter.name, f.name);
                  if (f.isPlayer) {
                    // Player died
                    const aliveCount = fightersRef.current.filter(x => x.isAlive && !x.isPlayer).length;
                    setPlacement(aliveCount + 1);
                  }
                }

                return {
                  ...f,
                  health: newHealth,
                  isAlive: newHealth > 0,
                  anim: newHealth > 0 ? 'hurt' : 'dead',
                };
              });
            });
          }, 150);
        }

        // Reset anim after attack
        if (didAttack) {
          setTimeout(() => {
            setFighters(p => p.map(f => f.id === fighter.id ? { ...f, anim: 'idle' } : f));
          }, 300);
        } else if (fighter.anim === 'hurt') {
          newAnim = 'idle';
        }

        return {
          ...fighter,
          x: Math.max(50, Math.min(750, newX)),
          y: Math.max(50, Math.min(550, newY)),
          anim: didAttack ? 'attacking' : newAnim,
          lastAttack: didAttack ? now : fighter.lastAttack,
          targetId: target.id,
        };
      });
    });
  };

  const checkGameEnd = () => {
    const current = fightersRef.current;
    const aliveFighters = current.filter(f => f.isAlive);
    const player = current.find(f => f.isPlayer);

    if (!player?.isAlive && phaseRef.current === 'fighting') {
      setPhase('defeated');
      cleanup();
      return;
    }

    if (aliveFighters.length === 1 && aliveFighters[0].isPlayer && phaseRef.current === 'fighting') {
      setPhase('victory');
      setPlacement(1);
      cleanup();
    }
  };

  const handlePlayAgain = () => {
    setPhase('loading');
    setPlayerKills(0);
    setPlacement(10);
    setKillFeed([]);
    setHitEffects([]);
    initializeFighters();
    setTimeout(() => startCountdown(), 100);
  };

  const handleExit = () => {
    cleanup();
    router.push('/');
  };

  const aliveCount = fighters.filter(f => f.isAlive).length;
  const player = fighters.find(f => f.isPlayer);

  if (error) {
    return (
      <div className="game-screen error">
        <div className="error-box">
          <div className="error-icon">😔</div>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/')}>Back to Home</button>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="game-screen">
      {/* HUD */}
      <div className="game-hud">
        <div className="hud-left">
          <div className="alive-count">
            <span className="alive-number">{aliveCount}</span>
            <span className="alive-label">ALIVE</span>
          </div>
          <div className="player-kills">
            <span className="kills-number">{playerKills}</span>
            <span className="kills-label">KILLS</span>
          </div>
        </div>

        <div className="hud-center">
          <h1 className="game-title">FACE ROYALE</h1>
        </div>

        <div className="hud-right">
          <button className="exit-btn" onClick={handleExit}>✕</button>
        </div>
      </div>

      {/* Player Health */}
      {player && (
        <div className="player-health-bar">
          <div className="health-label">{player.name}</div>
          <div className="health-track">
            <div className="health-fill" style={{ width: `${player.health}%` }} />
          </div>
          <div className="health-text">{Math.round(player.health)}/100</div>
        </div>
      )}

      {/* Arena */}
      <div className="arena">
        <div className="arena-bg" />

        {/* Fighters */}
        {fighters.map(fighter => fighter.isAlive && (
          <div
            key={fighter.id}
            className={`fighter ${fighter.anim} ${fighter.isPlayer ? 'is-player' : ''}`}
            style={{
              left: fighter.x,
              top: fighter.y,
              '--fighter-color': fighter.color,
            } as React.CSSProperties}
          >
            <div className="fighter-body">
              <div className="fighter-head">
                <div className="fighter-eyes">
                  <div className="eye" />
                  <div className="eye" />
                </div>
                <div className="fighter-mouth" />
              </div>
              <div className="fighter-torso" />
            </div>
            <div className="fighter-name">{fighter.name}</div>
            <div className="fighter-hp">
              <div className="hp-fill" style={{ width: `${fighter.health}%` }} />
            </div>
          </div>
        ))}

        {/* Hit Effects */}
        {hitEffects.map(effect => (
          <div
            key={effect.id}
            className="hit-effect"
            style={{ left: effect.x, top: effect.y }}
          >
            💥 -{effect.damage}
          </div>
        ))}

        {/* Active Move */}
        {activeMove && (
          <div className="move-indicator">{activeMove}</div>
        )}
      </div>

      {/* Kill Feed */}
      <div className="kill-feed">
        {killFeed.map(entry => (
          <div key={entry.id} className="kill-entry">
            <span className="killer">{entry.killer}</span>
            <span className="skull">☠️</span>
            <span className="victim">{entry.victim}</span>
          </div>
        ))}
      </div>

      {/* Face Cam */}
      <div className="face-cam">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className={`face-status ${faceStatus}`}>
          {faceStatus === 'good' && '✓ Face OK'}
          {faceStatus === 'no_face' && '⚠ No Face'}
          {faceStatus === 'too_far' && '↑ Closer'}
          {faceStatus === 'too_close' && '↓ Back'}
        </div>
        <div className="controls">
          <div>😮 Mouth = ROAR</div>
          <div>🤨 Brows = SHIELD</div>
          <div>🐡 Cheeks = BLAST</div>
          <div>↔️ Head = MOVE</div>
        </div>
      </div>

      {/* Countdown */}
      {countdown !== null && (
        <div className="overlay">
          <div className="countdown-text">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="overlay">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}

      {/* Victory */}
      {phase === 'victory' && (
        <div className="overlay victory">
          <div className="result-box">
            <div className="trophy">👑</div>
            <h1>VICTORY ROYALE!</h1>
            <p>{playerKills} eliminations</p>
            <div className="buttons">
              <button onClick={handlePlayAgain}>Play Again</button>
              <button className="secondary" onClick={handleExit}>Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* Defeated */}
      {phase === 'defeated' && (
        <div className="overlay defeated">
          <div className="result-box">
            <div className="skull">💀</div>
            <h1>ELIMINATED</h1>
            <p>#{placement} place • {playerKills} eliminations</p>
            <div className="buttons">
              <button onClick={handlePlayAgain}>Play Again</button>
              <button className="secondary" onClick={handleExit}>Exit</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .game-screen {
    min-height: 100vh;
    background: #0a0a0f;
    display: flex;
    flex-direction: column;
    font-family: 'Outfit', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .game-screen.error {
    align-items: center;
    justify-content: center;
  }

  .error-box {
    text-align: center;
    padding: 2rem;
  }

  .error-icon { font-size: 4rem; margin-bottom: 1rem; }
  .error-box h2 { font-family: 'Bangers', cursive; font-size: 2rem; color: white; margin-bottom: 1rem; }
  .error-box p { color: rgba(255,255,255,0.6); margin-bottom: 2rem; }
  .error-box button {
    padding: 1rem 2rem;
    font-family: 'Bangers', cursive;
    font-size: 1.25rem;
    background: linear-gradient(135deg, #FF3366, #6C5CE7);
    border: none;
    border-radius: 50px;
    color: white;
    cursor: pointer;
  }

  /* HUD */
  .game-hud {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgba(0,0,0,0.8);
    border-bottom: 2px solid #FF3366;
  }

  .hud-left, .hud-right { display: flex; gap: 2rem; align-items: center; }

  .alive-count, .player-kills {
    text-align: center;
  }

  .alive-number, .kills-number {
    display: block;
    font-family: 'Bangers', cursive;
    font-size: 2.5rem;
    line-height: 1;
  }

  .alive-number { color: #FF3366; }
  .kills-number { color: #FFE66D; }

  .alive-label, .kills-label {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.1em;
  }

  .game-title {
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #FF3366, #FFE66D);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }

  .exit-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.2);
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
  }

  /* Player Health */
  .player-health-bar {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0,0,0,0.8);
    padding: 0.5rem 1.5rem;
    border-radius: 50px;
    border: 2px solid #FFE66D;
    z-index: 10;
  }

  .health-label {
    font-family: 'Bangers', cursive;
    color: #FFE66D;
  }

  .health-track {
    width: 200px;
    height: 16px;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .health-fill {
    height: 100%;
    background: linear-gradient(90deg, #00D26A, #00FF88);
    transition: width 0.2s;
  }

  .health-text {
    color: white;
    font-size: 0.85rem;
    min-width: 60px;
  }

  /* Arena */
  .arena {
    flex: 1;
    position: relative;
    margin: 1rem;
    border-radius: 1rem;
    overflow: hidden;
    border: 3px solid rgba(255,255,255,0.1);
  }

  .arena-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at center, rgba(255,51,102,0.1) 0%, transparent 70%),
      linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%);
  }

  /* Fighters */
  .fighter {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: left 0.1s, top 0.1s;
  }

  .fighter-body {
    position: relative;
  }

  .fighter-head {
    width: 36px;
    height: 36px;
    background: var(--fighter-color, #666);
    border-radius: 50%;
    position: relative;
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 15px var(--fighter-color, #666);
  }

  .is-player .fighter-head {
    width: 44px;
    height: 44px;
    box-shadow: 0 0 25px var(--fighter-color, #FFE66D), 0 0 50px var(--fighter-color, #FFE66D);
  }

  .fighter-eyes {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-top: 10px;
  }

  .is-player .fighter-eyes { padding-top: 12px; gap: 10px; }

  .eye {
    width: 6px;
    height: 6px;
    background: #1a1a2e;
    border-radius: 50%;
  }

  .is-player .eye { width: 8px; height: 8px; }

  .fighter-mouth {
    width: 10px;
    height: 5px;
    background: rgba(0,0,0,0.5);
    border-radius: 0 0 10px 10px;
    margin: 4px auto 0;
  }

  .is-player .fighter-mouth { width: 12px; height: 6px; }

  .fighter-torso {
    width: 28px;
    height: 36px;
    background: var(--fighter-color, #666);
    border-radius: 10px 10px 15px 15px;
    margin-top: -4px;
    border: 2px solid rgba(255,255,255,0.2);
  }

  .is-player .fighter-torso {
    width: 34px;
    height: 44px;
  }

  .fighter-name {
    font-family: 'Bangers', cursive;
    font-size: 0.65rem;
    color: white;
    margin-top: 4px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  }

  .is-player .fighter-name { font-size: 0.75rem; }

  .fighter-hp {
    width: 40px;
    height: 4px;
    background: rgba(0,0,0,0.5);
    border-radius: 2px;
    margin-top: 2px;
    overflow: hidden;
  }

  .is-player .fighter-hp { width: 50px; height: 5px; }

  .hp-fill {
    height: 100%;
    background: #00D26A;
    transition: width 0.2s;
  }

  /* Fighter animations */
  .fighter.attacking .fighter-body {
    animation: attack 0.2s ease-out;
  }

  .fighter.hurt .fighter-body {
    animation: hurt 0.15s ease-out;
  }

  .fighter.blocking .fighter-body {
    opacity: 0.7;
    transform: scale(0.9);
  }

  @keyframes attack {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  @keyframes hurt {
    0%, 100% { filter: none; }
    50% { filter: brightness(3) saturate(0); }
  }

  /* Hit effects */
  .hit-effect {
    position: absolute;
    transform: translate(-50%, -50%);
    font-family: 'Bangers', cursive;
    font-size: 1.25rem;
    color: #FF3366;
    text-shadow: 0 0 10px #FF3366;
    pointer-events: none;
    animation: hitPop 0.6s ease-out forwards;
  }

  @keyframes hitPop {
    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -100%) scale(1.5); }
  }

  /* Move indicator */
  .move-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bangers', cursive;
    font-size: 3rem;
    color: #FFE66D;
    text-shadow: 0 0 30px rgba(255,230,109,0.8);
    animation: moveFlash 0.4s ease-out forwards;
    pointer-events: none;
  }

  @keyframes moveFlash {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    30% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
  }

  /* Kill feed */
  .kill-feed {
    position: absolute;
    top: 140px;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    z-index: 10;
  }

  .kill-entry {
    background: rgba(0,0,0,0.8);
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    animation: fadeIn 0.3s ease-out;
  }

  .killer { color: #FF3366; font-weight: bold; }
  .skull { margin: 0 0.5rem; }
  .victim { color: rgba(255,255,255,0.6); }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* Face cam */
  .face-cam {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    width: 180px;
    background: rgba(0,0,0,0.9);
    border-radius: 0.75rem;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.2);
    z-index: 20;
  }

  .face-cam video {
    width: 100%;
    height: 120px;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .face-status {
    padding: 0.35rem;
    text-align: center;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .face-status.good { background: #00D26A; color: white; }
  .face-status.no_face { background: #FF3366; color: white; }
  .face-status.too_far, .face-status.too_close { background: #FFE66D; color: #1a1a2e; }

  .controls {
    padding: 0.4rem;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.6);
    background: rgba(0,0,0,0.5);
  }

  .controls div { margin: 0.15rem 0; }

  /* Overlays */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .countdown-text {
    font-family: 'Bangers', cursive;
    font-size: 10rem;
    background: linear-gradient(135deg, #FF3366, #FFE66D, #00D9FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: countPulse 1s ease-in-out;
  }

  @keyframes countPulse {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #FF3366;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .overlay p { color: rgba(255,255,255,0.8); font-size: 1.25rem; }

  .result-box { text-align: center; }

  .trophy, .skull {
    font-size: 6rem;
    animation: bounce 1s ease infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .result-box h1 {
    font-family: 'Bangers', cursive;
    font-size: 4rem;
    margin: 1rem 0;
  }

  .victory h1 {
    background: linear-gradient(135deg, #FFE66D, #FF3366);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .defeated h1 { color: #FF3366; }

  .result-box p {
    color: rgba(255,255,255,0.6);
    font-size: 1.25rem;
    margin-bottom: 2rem;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .buttons button {
    padding: 1rem 2.5rem;
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #FF3366, #6C5CE7);
    border: none;
    border-radius: 50px;
    color: white;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .buttons button:hover { transform: scale(1.05); }

  .buttons button.secondary {
    background: transparent;
    border: 2px solid rgba(255,255,255,0.3);
  }
`;
