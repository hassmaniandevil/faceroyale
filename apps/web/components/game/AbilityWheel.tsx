'use client';

import type { ExpressionState } from '@faceroyale/face-tracking';
import type { ActionTriggerSystem } from '@faceroyale/face-tracking';
import { ABILITIES } from '@faceroyale/game-core';

interface AbilityWheelProps {
  expressions: ExpressionState | null;
  triggerSystem: ActionTriggerSystem | null;
}

const ABILITY_DISPLAY = [
  { id: 'screamAttack', icon: '😱', expression: 'mouthOpen', label: 'Scream' },
  { id: 'shieldBurst', icon: '🛡️', expression: 'browRaise', label: 'Shield' },
  { id: 'intimidate', icon: '😤', expression: 'browFurrow', label: 'Intimidate' },
  { id: 'charm', icon: '😊', expression: 'smile', label: 'Charm' },
  { id: 'explosivePush', icon: '💨', expression: 'cheekPuff', label: 'Push' },
  { id: 'quickStrike', icon: '⚡', expression: 'leftBlink', label: 'Strike' },
];

export function AbilityWheel({ expressions, triggerSystem }: AbilityWheelProps) {
  return (
    <div className="pointer-events-auto">
      <div className="grid grid-cols-2 gap-2">
        {ABILITY_DISPLAY.map((ability) => {
          const cooldown = triggerSystem?.getCooldown(ability.id) ?? 0;
          const cooldownMax = ABILITIES[ability.id as keyof typeof ABILITIES]?.cooldown ?? 1;
          const fatigue = triggerSystem?.getFatigue(ability.id) ?? 0;
          const holdProgress = triggerSystem?.getHoldProgress(ability.id) ?? 0;

          let intensity = 0;
          if (expressions) {
            if (ability.expression === 'leftBlink') {
              intensity = Math.max(
                expressions.leftBlink,
                expressions.rightBlink
              );
            } else {
              intensity =
                expressions[ability.expression as keyof ExpressionState] ?? 0;
            }
          }

          const isReady = cooldown === 0;
          const isActive = intensity > 0.3 && isReady;

          return (
            <div key={ability.id} className="relative">
              <div
                className={`ability-icon ${isReady ? 'ready' : 'on-cooldown'} ${
                  isActive ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <span className="text-2xl">{ability.icon}</span>

                {/* Intensity fill */}
                {isReady && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-yellow-500/30 rounded-b-xl transition-all"
                    style={{ height: `${intensity * 100}%` }}
                  />
                )}

                {/* Cooldown overlay */}
                {cooldown > 0 && (
                  <div className="cooldown-overlay">
                    <span className="text-sm font-bold">
                      {Math.ceil(cooldown / 1000)}
                    </span>
                  </div>
                )}

                {/* Cooldown progress ring */}
                {cooldown > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 56 56"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${((cooldownMax - cooldown) / cooldownMax) * 151} 151`}
                      className="text-green-500"
                    />
                  </svg>
                )}

                {/* Fatigue indicator */}
                {fatigue > 0 && (
                  <div
                    className="absolute top-0 left-0 right-0 bg-red-500/50 rounded-t-xl"
                    style={{ height: `${fatigue * 100}%` }}
                  />
                )}

                {/* Hold progress */}
                {holdProgress > 0 && holdProgress < 1 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-white/50">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeDasharray={`${holdProgress * 88} 88`}
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="text-center text-xs text-gray-400 mt-1">
                {ability.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
