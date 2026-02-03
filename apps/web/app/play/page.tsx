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

// Expression types that trigger attacks
type Expression = 'mouthOpen' | 'browRaise' | 'cheekPuff' | 'headLeft' | 'headRight';

interface GameState {
  phase: 'loading' | 'countdown' | 'fighting' | 'roundEnd' | 'gameOver';
  playerHealth: number;
  cpuHealth: number;
  playerMeter: number;
  cpuMeter: number;
  round: number;
  playerWins: number;
  cpuWins: number;
  timer: number;
  winner: 'player' | 'cpu' | null;
}

interface HitEffect {
  id: string;
  damage: number;
  x: number;
  y: number;
  isPlayer: boolean;
}

declare const FaceMesh: any;

export default function PlayPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { username } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'loading',
    playerHealth: 100,
    cpuHealth: 100,
    playerMeter: 0,
    cpuMeter: 0,
    round: 1,
    playerWins: 0,
    cpuWins: 0,
    timer: 60,
    winner: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'good' | 'no_face' | 'too_far' | 'too_close'>('no_face');
  const [playerAnim, setPlayerAnim] = useState<string>('idle');
  const [cpuAnim, setCpuAnim] = useState<string>('idle');
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const lastExpressionTime = useRef<Record<string, number>>({});
  const cpuIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Load MediaPipe FaceMesh via CDN
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

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (cpuIntervalRef.current) {
      clearInterval(cpuIntervalRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
    }
  };

  const initializeGame = async () => {
    try {
      // Request camera
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

      // Initialize FaceMesh
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

      console.log('[FaceRoyale] Ready! Starting countdown...');
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
          setGameState(prev => ({ ...prev, phase: 'fighting' }));
          startFaceTracking();
          startCpuAI();
          startTimer();
        }, 500);
      }
    }, 1000);
  };

  const startFaceTracking = () => {
    const processFrame = async () => {
      if (videoRef.current && faceMeshRef.current && gameStateRef.current.phase === 'fighting') {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (e) {
          // Ignore frame errors
        }
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

    // Check face distance
    const faceHeight = Math.abs(landmarks[LANDMARKS.chin].y - landmarks[LANDMARKS.foreheadTop].y);
    const faceWidth = Math.abs(landmarks[LANDMARKS.rightCheek].x - landmarks[LANDMARKS.leftCheek].x);
    const faceSize = (faceHeight + faceWidth) / 2;

    if (faceSize < 0.15) {
      setFaceStatus('too_far');
    } else if (faceSize > 0.5) {
      setFaceStatus('too_close');
    } else {
      setFaceStatus('good');
    }

    // Calculate expressions
    const expressions = calculateExpressions(landmarks);

    // Trigger attacks based on expressions
    if (gameStateRef.current.phase === 'fighting') {
      checkExpressionTriggers(expressions);
    }
  };

  const calculateExpressions = (landmarks: any[]) => {
    const expressions: Record<Expression, number> = {
      mouthOpen: 0,
      browRaise: 0,
      cheekPuff: 0,
      headLeft: 0,
      headRight: 0,
    };

    // Mouth open
    const mouthOpen = getDistance(landmarks[LANDMARKS.lipTop], landmarks[LANDMARKS.lipBottom]);
    expressions.mouthOpen = Math.max(0, Math.min(1, mouthOpen * 20));

    // Brow raise
    const leftBrow = getDistance(landmarks[LANDMARKS.leftBrowInner], landmarks[LANDMARKS.foreheadTop]);
    const rightBrow = getDistance(landmarks[LANDMARKS.rightBrowInner], landmarks[LANDMARKS.foreheadTop]);
    const browAvg = (leftBrow + rightBrow) / 2;
    expressions.browRaise = Math.max(0, Math.min(1, (0.08 - browAvg) * 10 + 0.5));

    // Cheek puff (face width)
    const cheekDistance = getDistance(landmarks[LANDMARKS.leftCheek], landmarks[LANDMARKS.rightCheek]);
    expressions.cheekPuff = Math.max(0, Math.min(1, (cheekDistance - 0.32) * 8));

    // Head turn
    const noseX = landmarks[LANDMARKS.noseTip].x;
    const leftCheekX = landmarks[LANDMARKS.leftCheek].x;
    const rightCheekX = landmarks[LANDMARKS.rightCheek].x;
    const noseToLeft = noseX - leftCheekX;
    const noseToRight = rightCheekX - noseX;
    const turnRatio = (noseToLeft - noseToRight) / (noseToLeft + noseToRight);

    if (turnRatio > 0.15) {
      expressions.headRight = Math.min(1, turnRatio * 3);
    } else if (turnRatio < -0.15) {
      expressions.headLeft = Math.min(1, Math.abs(turnRatio) * 3);
    }

    return expressions;
  };

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const checkExpressionTriggers = (expressions: Record<Expression, number>) => {
    const now = Date.now();
    const cooldown = 600; // ms between attacks

    // ROAR - Open mouth wide
    if (expressions.mouthOpen > 0.5) {
      const lastTime = lastExpressionTime.current.mouthOpen || 0;
      if (now - lastTime > cooldown) {
        lastExpressionTime.current.mouthOpen = now;
        playerAttack('ROAR', 15, '#FF3366');
      }
    }

    // SHIELD - Raise eyebrows
    if (expressions.browRaise > 0.6) {
      const lastTime = lastExpressionTime.current.browRaise || 0;
      if (now - lastTime > cooldown * 1.5) {
        lastExpressionTime.current.browRaise = now;
        playerShield();
      }
    }

    // BLAST - Puff cheeks
    if (expressions.cheekPuff > 0.4) {
      const lastTime = lastExpressionTime.current.cheekPuff || 0;
      if (now - lastTime > cooldown) {
        lastExpressionTime.current.cheekPuff = now;
        playerAttack('BLAST', 12, '#FFE66D');
      }
    }

    // DODGE - Turn head
    if (expressions.headLeft > 0.5 || expressions.headRight > 0.5) {
      const lastTime = lastExpressionTime.current.dodge || 0;
      if (now - lastTime > cooldown * 0.8) {
        lastExpressionTime.current.dodge = now;
        playerDodge(expressions.headLeft > expressions.headRight ? 'left' : 'right');
      }
    }
  };

  const playerAttack = (moveName: string, damage: number, color: string) => {
    setActiveMove(moveName);
    setPlayerAnim('attacking');

    // Show attack animation
    setTimeout(() => {
      setPlayerAnim('idle');
      setActiveMove(null);
    }, 300);

    // Deal damage to CPU
    setGameState(prev => {
      const newCpuHealth = Math.max(0, prev.cpuHealth - damage);
      const newMeter = Math.min(100, prev.playerMeter + 5);

      // Add hit effect
      addHitEffect(damage, false);

      // Check for KO
      if (newCpuHealth <= 0) {
        handleRoundEnd('player');
      }

      return { ...prev, cpuHealth: newCpuHealth, playerMeter: newMeter };
    });

    // CPU hurt animation
    setCpuAnim('hurt');
    setTimeout(() => setCpuAnim('idle'), 200);
  };

  const playerShield = () => {
    setActiveMove('SHIELD');
    setPlayerAnim('blocking');

    // Give shield/meter
    setGameState(prev => ({
      ...prev,
      playerMeter: Math.min(100, prev.playerMeter + 15),
    }));

    setTimeout(() => {
      setPlayerAnim('idle');
      setActiveMove(null);
    }, 500);
  };

  const playerDodge = (direction: 'left' | 'right') => {
    setActiveMove(`DODGE ${direction.toUpperCase()}`);
    setPlayerAnim(`dodge-${direction}`);

    setTimeout(() => {
      setPlayerAnim('idle');
      setActiveMove(null);
    }, 300);
  };

  const addHitEffect = (damage: number, isPlayer: boolean) => {
    const effect: HitEffect = {
      id: Math.random().toString(36),
      damage,
      x: isPlayer ? 30 : 70, // % position
      y: 40 + Math.random() * 20,
      isPlayer,
    };
    setHitEffects(prev => [...prev, effect]);

    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== effect.id));
    }, 800);
  };

  const startCpuAI = () => {
    cpuIntervalRef.current = setInterval(() => {
      if (gameStateRef.current.phase !== 'fighting') return;
      if (gameStateRef.current.cpuHealth <= 0 || gameStateRef.current.playerHealth <= 0) return;

      // Random CPU action
      const action = Math.random();

      if (action < 0.6) {
        // Attack
        cpuAttack();
      } else if (action < 0.8) {
        // Block
        setCpuAnim('blocking');
        setTimeout(() => setCpuAnim('idle'), 500);
      }
    }, 1200);
  };

  const cpuAttack = () => {
    const attacks = [
      { name: 'PUNCH', damage: 8 },
      { name: 'KICK', damage: 10 },
      { name: 'HEADBUTT', damage: 12 },
    ];
    const attack = attacks[Math.floor(Math.random() * attacks.length)];

    setCpuAnim('attacking');

    setTimeout(() => {
      setCpuAnim('idle');

      // Deal damage to player
      setGameState(prev => {
        // Check if player is blocking
        if (playerAnim === 'blocking') {
          addHitEffect(Math.round(attack.damage * 0.2), true);
          return { ...prev, playerHealth: Math.max(0, prev.playerHealth - attack.damage * 0.2) };
        }

        const newPlayerHealth = Math.max(0, prev.playerHealth - attack.damage);
        addHitEffect(attack.damage, true);

        if (newPlayerHealth <= 0) {
          handleRoundEnd('cpu');
        }

        return { ...prev, playerHealth: newPlayerHealth };
      });

      // Player hurt
      if (playerAnim !== 'blocking') {
        setPlayerAnim('hurt');
        setTimeout(() => setPlayerAnim('idle'), 200);
      }
    }, 200);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.phase !== 'fighting') return prev;

        const newTimer = prev.timer - 1;
        if (newTimer <= 0) {
          // Time's up - whoever has more health wins
          const winner = prev.playerHealth > prev.cpuHealth ? 'player' : 'cpu';
          handleRoundEnd(winner);
        }
        return { ...prev, timer: Math.max(0, newTimer) };
      });
    }, 1000);
  };

  const handleRoundEnd = (winner: 'player' | 'cpu') => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (cpuIntervalRef.current) clearInterval(cpuIntervalRef.current);

    setGameState(prev => {
      const newPlayerWins = winner === 'player' ? prev.playerWins + 1 : prev.playerWins;
      const newCpuWins = winner === 'cpu' ? prev.cpuWins + 1 : prev.cpuWins;

      // Check for match end (best of 3)
      if (newPlayerWins >= 2 || newCpuWins >= 2) {
        return {
          ...prev,
          phase: 'gameOver',
          playerWins: newPlayerWins,
          cpuWins: newCpuWins,
          winner: newPlayerWins >= 2 ? 'player' : 'cpu',
        };
      }

      // Next round
      return {
        ...prev,
        phase: 'roundEnd',
        playerWins: newPlayerWins,
        cpuWins: newCpuWins,
      };
    });
  };

  const startNextRound = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'countdown',
      playerHealth: 100,
      cpuHealth: 100,
      round: prev.round + 1,
      timer: 60,
    }));

    setTimeout(() => {
      startCountdown();
    }, 500);
  };

  const handlePlayAgain = () => {
    setGameState({
      phase: 'countdown',
      playerHealth: 100,
      cpuHealth: 100,
      playerMeter: 0,
      cpuMeter: 0,
      round: 1,
      playerWins: 0,
      cpuWins: 0,
      timer: 60,
      winner: null,
    });
    startCountdown();
  };

  const handleExit = () => {
    cleanup();
    router.push('/');
  };

  // Error screen
  if (error) {
    return (
      <div className="game-screen error">
        <div className="error-content">
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
        <div className="player-info player1">
          <div className="player-name">{username || 'YOU'}</div>
          <div className="health-bar">
            <div className="health-fill" style={{ width: `${gameState.playerHealth}%` }} />
          </div>
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${gameState.playerMeter}%` }} />
          </div>
          <div className="wins">{'🏆'.repeat(gameState.playerWins)}</div>
        </div>

        <div className="round-info">
          <div className="timer">{gameState.timer}</div>
          <div className="round">ROUND {gameState.round}</div>
        </div>

        <div className="player-info player2">
          <div className="player-name">CPU</div>
          <div className="health-bar">
            <div className="health-fill cpu" style={{ width: `${gameState.cpuHealth}%` }} />
          </div>
          <div className="meter-bar">
            <div className="meter-fill cpu" style={{ width: `${gameState.cpuMeter}%` }} />
          </div>
          <div className="wins">{'🏆'.repeat(gameState.cpuWins)}</div>
        </div>
      </div>

      {/* Arena */}
      <div className="game-arena">
        <div className="arena-bg" />

        {/* Player Fighter */}
        <div className={`fighter fighter1 ${playerAnim}`}>
          <div className="fighter-char">
            <div className="head">
              <div className="eyes">
                <div className="eye" />
                <div className="eye" />
              </div>
              <div className="mouth" />
            </div>
            <div className="body" />
          </div>
          <span className="fighter-tag">{username || 'YOU'}</span>
        </div>

        {/* CPU Fighter */}
        <div className={`fighter fighter2 ${cpuAnim}`}>
          <div className="fighter-char cpu-char">
            <div className="head">
              <div className="eyes">
                <div className="eye" />
                <div className="eye" />
              </div>
              <div className="mouth" />
            </div>
            <div className="body" />
          </div>
          <span className="fighter-tag">CPU</span>
        </div>

        {/* Hit Effects */}
        <div className="effects-layer">
          {hitEffects.map(effect => (
            <div
              key={effect.id}
              className="hit-effect"
              style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
            >
              💥 -{effect.damage}
            </div>
          ))}
        </div>

        {/* Active Move Indicator */}
        {activeMove && (
          <div className="move-indicator">
            {activeMove}
          </div>
        )}
      </div>

      {/* Face Cam */}
      <div className="face-cam">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className={`face-status ${faceStatus}`}>
          {faceStatus === 'good' && '✓ Face Detected'}
          {faceStatus === 'no_face' && '⚠ No Face'}
          {faceStatus === 'too_far' && '↑ Move Closer'}
          {faceStatus === 'too_close' && '↓ Move Back'}
        </div>
        <div className="controls-hint">
          <div>😮 Open Mouth = ROAR</div>
          <div>🤨 Raise Brows = SHIELD</div>
          <div>🐡 Puff Cheeks = BLAST</div>
          <div>↔️ Turn Head = DODGE</div>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="overlay countdown">
          <div className="countdown-text">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {gameState.phase === 'loading' && (
        <div className="overlay loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}

      {/* Round End Overlay */}
      {gameState.phase === 'roundEnd' && (
        <div className="overlay round-end">
          <div className="round-result">
            <h2>{gameState.playerWins > gameState.cpuWins ? 'YOU WIN THE ROUND!' : 'CPU WINS THE ROUND!'}</h2>
            <p>Score: {gameState.playerWins} - {gameState.cpuWins}</p>
            <button onClick={startNextRound}>Next Round</button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState.phase === 'gameOver' && (
        <div className="overlay game-over">
          <div className="game-result">
            {gameState.winner === 'player' ? (
              <>
                <div className="result-icon">👑</div>
                <h1>VICTORY!</h1>
              </>
            ) : (
              <>
                <div className="result-icon">💀</div>
                <h1>DEFEATED</h1>
              </>
            )}
            <p>Final Score: {gameState.playerWins} - {gameState.cpuWins}</p>
            <div className="buttons">
              <button onClick={handlePlayAgain}>Play Again</button>
              <button onClick={handleExit} className="secondary">Exit</button>
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
    background: linear-gradient(180deg, #0a0a0f, #1a1a2e);
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

  .error-content {
    text-align: center;
    padding: 2rem;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-content h2 {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    color: white;
    margin-bottom: 1rem;
  }

  .error-content p {
    color: rgba(255,255,255,0.6);
    margin-bottom: 2rem;
  }

  .error-content button {
    padding: 1rem 2rem;
    font-size: 1.25rem;
    font-family: 'Bangers', cursive;
    background: linear-gradient(135deg, #FF3366, #6C5CE7);
    border: none;
    border-radius: 100px;
    color: white;
    cursor: pointer;
  }

  /* HUD */
  .game-hud {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem 1.5rem;
    background: rgba(0,0,0,0.6);
    border-bottom: 2px solid rgba(255,255,255,0.1);
  }

  .player-info {
    width: 200px;
  }

  .player-name {
    font-family: 'Bangers', cursive;
    font-size: 1.25rem;
    color: white;
    margin-bottom: 0.5rem;
  }

  .player2 .player-name {
    text-align: right;
  }

  .health-bar {
    height: 20px;
    background: rgba(0,0,0,0.5);
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.2);
  }

  .health-fill {
    height: 100%;
    background: linear-gradient(90deg, #00D26A, #00FF88);
    transition: width 0.3s;
    border-radius: 8px;
  }

  .health-fill.cpu {
    background: linear-gradient(90deg, #FF3366, #FF6B6B);
  }

  .meter-bar {
    height: 8px;
    background: rgba(0,0,0,0.5);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .meter-fill {
    height: 100%;
    background: linear-gradient(90deg, #00D9FF, #00FFFF);
    transition: width 0.3s;
  }

  .meter-fill.cpu {
    background: linear-gradient(90deg, #FFE66D, #FFAA00);
  }

  .wins {
    margin-top: 0.25rem;
    font-size: 1.25rem;
  }

  .player2 .wins {
    text-align: right;
  }

  .round-info {
    text-align: center;
  }

  .timer {
    font-family: 'Bangers', cursive;
    font-size: 3rem;
    color: white;
    text-shadow: 0 0 20px rgba(255,255,255,0.5);
  }

  .round {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    color: rgba(255,255,255,0.6);
  }

  /* Arena */
  .game-arena {
    flex: 1;
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 2rem;
    min-height: 400px;
  }

  .arena-bg {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(transparent 60%, rgba(0,0,0,0.8)),
      radial-gradient(ellipse at bottom, rgba(255,51,102,0.2), transparent 70%);
  }

  /* Fighters */
  .fighter {
    position: absolute;
    bottom: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.1s;
  }

  .fighter1 {
    left: 20%;
  }

  .fighter2 {
    right: 20%;
  }

  .fighter-char {
    width: 100px;
    height: 140px;
    position: relative;
  }

  .fighter-char .head {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #FFE66D, #FFCC00);
    border-radius: 50%;
    margin: 0 auto;
    position: relative;
    border: 3px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 20px rgba(255,230,109,0.5);
  }

  .cpu-char .head {
    background: linear-gradient(135deg, #FF6B6B, #FF3366);
    box-shadow: 0 0 20px rgba(255,51,102,0.5);
  }

  .eyes {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding-top: 15px;
  }

  .eye {
    width: 10px;
    height: 10px;
    background: #1a1a2e;
    border-radius: 50%;
  }

  .mouth {
    width: 15px;
    height: 8px;
    background: #8B0000;
    border-radius: 0 0 10px 10px;
    margin: 8px auto 0;
  }

  .fighter-char .body {
    width: 50px;
    height: 70px;
    background: linear-gradient(180deg, #FFE66D, #FFAA00);
    border-radius: 20px 20px 25px 25px;
    margin: -5px auto 0;
    border: 3px solid rgba(255,255,255,0.2);
  }

  .cpu-char .body {
    background: linear-gradient(180deg, #FF6B6B, #FF3366);
  }

  .fighter-tag {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    color: white;
    margin-top: 0.5rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  /* Fighter Animations */
  .fighter.attacking {
    animation: attack 0.3s ease-out;
  }

  .fighter1.attacking {
    transform: translateX(50px);
  }

  .fighter2.attacking {
    transform: translateX(-50px);
  }

  .fighter.hurt {
    animation: hurt 0.2s ease-out;
  }

  .fighter1.hurt {
    transform: translateX(-20px);
  }

  .fighter2.hurt {
    transform: translateX(20px);
  }

  .fighter.blocking {
    opacity: 0.8;
  }

  .fighter.blocking .fighter-char {
    transform: scale(0.95);
    filter: brightness(0.8) saturate(0.8);
  }

  .fighter.dodge-left {
    transform: translateX(-60px);
  }

  .fighter.dodge-right {
    transform: translateX(60px);
  }

  @keyframes attack {
    0% { transform: translateX(0); }
    50% { transform: translateX(var(--attack-dir, 50px)); }
    100% { transform: translateX(0); }
  }

  @keyframes hurt {
    0%, 100% { transform: translateX(0); filter: none; }
    50% { filter: brightness(2) saturate(0); }
  }

  /* Effects */
  .effects-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .hit-effect {
    position: absolute;
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    color: #FF3366;
    text-shadow: 0 0 10px #FF3366;
    animation: hitFloat 0.8s ease-out forwards;
  }

  @keyframes hitFloat {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-50px) scale(1.5); }
  }

  .move-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bangers', cursive;
    font-size: 2.5rem;
    color: #FFE66D;
    text-shadow: 0 0 20px rgba(255,230,109,0.8), 0 0 40px rgba(255,51,102,0.5);
    animation: moveFlash 0.5s ease-out forwards;
  }

  @keyframes moveFlash {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    30% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
  }

  /* Face Cam */
  .face-cam {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    width: 200px;
    background: rgba(0,0,0,0.8);
    border-radius: 1rem;
    overflow: hidden;
    border: 3px solid rgba(255,255,255,0.2);
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
  }

  .face-cam video {
    width: 100%;
    height: 150px;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .face-status {
    padding: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: bold;
  }

  .face-status.good {
    background: #00D26A;
    color: white;
  }

  .face-status.no_face {
    background: #FF3366;
    color: white;
  }

  .face-status.too_far, .face-status.too_close {
    background: #FFE66D;
    color: #1a1a2e;
  }

  .controls-hint {
    padding: 0.5rem;
    font-size: 0.65rem;
    color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.5);
  }

  .controls-hint div {
    margin: 0.25rem 0;
  }

  /* Overlays */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .overlay.countdown {
    background: rgba(0,0,0,0.7);
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

  .loading {
    flex-direction: column;
    gap: 1rem;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #FF3366;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    color: rgba(255,255,255,0.8);
    font-size: 1.25rem;
  }

  .round-end, .game-over {
    flex-direction: column;
    text-align: center;
  }

  .round-result, .game-result {
    padding: 2rem;
  }

  .round-result h2, .game-result h1 {
    font-family: 'Bangers', cursive;
    color: white;
    margin-bottom: 1rem;
  }

  .round-result h2 {
    font-size: 2.5rem;
  }

  .game-result h1 {
    font-size: 4rem;
    background: linear-gradient(135deg, #FFE66D, #FF3366);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .result-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
    animation: bounce 1s ease infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .round-result p, .game-result p {
    color: rgba(255,255,255,0.6);
    font-size: 1.25rem;
    margin-bottom: 2rem;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .round-result button, .game-result button {
    padding: 1rem 2.5rem;
    font-size: 1.5rem;
    font-family: 'Bangers', cursive;
    background: linear-gradient(135deg, #FF3366, #6C5CE7);
    border: none;
    border-radius: 100px;
    color: white;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .round-result button:hover, .game-result button:hover {
    transform: scale(1.05);
  }

  .game-result button.secondary {
    background: transparent;
    border: 2px solid rgba(255,255,255,0.3);
  }
`;
