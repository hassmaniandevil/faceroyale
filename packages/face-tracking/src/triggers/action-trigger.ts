/**
 * Action Trigger System for FaceRoyale
 * Maps facial expressions to battle royale abilities with fatigue mechanics
 * Thresholds tuned for reliable detection based on FaceFights implementation
 */

import type { ExpressionState, ActionTrigger, TriggeredAction } from '../types';

/**
 * Ability triggers mapped from expressions
 * Lower thresholds for better responsiveness
 */
export const ABILITY_TRIGGERS: Record<string, ActionTrigger> = {
  screamAttack: {
    expression: 'mouthOpen',
    threshold: 0.35, // Lowered from 0.6
    holdTime: 80,
    cooldown: 2500,
    fatiguePenalty: 0.12,
  },
  shieldBurst: {
    expression: 'browRaise',
    threshold: 0.3, // Lowered from 0.7
    holdTime: 100,
    cooldown: 6000,
    fatiguePenalty: 0.1,
  },
  intimidate: {
    expression: 'browFurrow',
    threshold: 0.25, // Lowered from 0.6
    holdTime: 100,
    cooldown: 8000,
    fatiguePenalty: 0.12,
  },
  charm: {
    expression: 'smile',
    threshold: 0.3, // Lowered from 0.7
    holdTime: 150,
    cooldown: 10000,
    fatiguePenalty: 0.15,
  },
  explosivePush: {
    expression: 'cheekPuff',
    threshold: 0.3, // Lowered from 0.65
    holdTime: 100,
    cooldown: 4000,
    fatiguePenalty: 0.12,
  },
  quickStrike: {
    expression: 'leftBlink',
    threshold: 0.7, // Blinks need higher threshold
    holdTime: 30,
    cooldown: 1500,
    fatiguePenalty: 0.08,
  },
  meditate: {
    expression: 'neutral',
    threshold: 0.7,
    holdTime: 1500, // Hold neutral 1.5s to heal
    cooldown: 12000,
    fatiguePenalty: 0.05,
  },
};

interface TriggerState {
  cooldown: number;
  holdTime: number;
  lastValue: number;
}

interface FatigueState {
  count: number;
  penalty: number;
  lastUse: number;
}

export class ActionTriggerSystem {
  private states: Map<string, TriggerState> = new Map();
  private fatigue: Map<string, FatigueState> = new Map();
  private fatigueWindowMs = 30000;
  private fatigueDecayMs = 5000;
  private debugMode = false;

  constructor() {
    for (const id of Object.keys(ABILITY_TRIGGERS)) {
      this.states.set(id, { cooldown: 0, holdTime: 0, lastValue: 0 });
      this.fatigue.set(id, { count: 0, penalty: 0, lastUse: 0 });
    }
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  update(expressions: ExpressionState, deltaMs: number): TriggeredAction[] {
    const triggered: TriggeredAction[] = [];
    const now = Date.now();

    for (const [actionId, trigger] of Object.entries(ABILITY_TRIGGERS)) {
      const state = this.states.get(actionId)!;
      const fat = this.fatigue.get(actionId)!;

      // Update cooldown
      if (state.cooldown > 0) {
        state.cooldown = Math.max(0, state.cooldown - deltaMs);
        continue;
      }

      // Get expression intensity
      let intensity = expressions[trigger.expression] as number;

      // Special case: Quick Strike can trigger from either eye blink
      if (actionId === 'quickStrike') {
        intensity = Math.max(expressions.leftBlink, expressions.rightBlink);
      }

      // Store for debugging
      state.lastValue = intensity;

      // Check if above threshold
      if (intensity >= trigger.threshold) {
        state.holdTime += deltaMs;

        if (this.debugMode) {
          console.log(`[${actionId}] intensity: ${intensity.toFixed(2)}, holdTime: ${state.holdTime}ms`);
        }

        // Check if held long enough
        if (state.holdTime >= trigger.holdTime) {
          const effectiveness = 1 - fat.penalty;
          const effectiveIntensity = intensity * effectiveness;

          triggered.push({
            actionId,
            intensity: effectiveIntensity,
            timestamp: now,
          });

          if (this.debugMode) {
            console.log(`[${actionId}] TRIGGERED! intensity: ${effectiveIntensity.toFixed(2)}`);
          }

          state.cooldown = trigger.cooldown;
          state.holdTime = 0;

          fat.count++;
          fat.penalty = Math.min(0.8, fat.count * trigger.fatiguePenalty);
          fat.lastUse = now;
        }
      } else {
        // Reset hold time if below threshold
        if (state.holdTime > 0 && this.debugMode) {
          console.log(`[${actionId}] reset hold (intensity: ${intensity.toFixed(2)} < threshold: ${trigger.threshold})`);
        }
        state.holdTime = 0;
      }
    }

    this.decayFatigue(deltaMs);
    return triggered;
  }

  private decayFatigue(deltaMs: number): void {
    const now = Date.now();

    for (const [id, fat] of this.fatigue) {
      if (now - fat.lastUse > this.fatigueDecayMs) {
        const decayRate = deltaMs / 1000;
        fat.count = Math.max(0, fat.count - decayRate);
        fat.penalty = Math.min(
          0.8,
          fat.count * ABILITY_TRIGGERS[id].fatiguePenalty
        );
      }
    }
  }

  getFatigue(actionId: string): number {
    return this.fatigue.get(actionId)?.penalty ?? 0;
  }

  getCooldown(actionId: string): number {
    return this.states.get(actionId)?.cooldown ?? 0;
  }

  getCooldownProgress(actionId: string): number {
    const trigger = ABILITY_TRIGGERS[actionId];
    if (!trigger) return 1;

    const remaining = this.getCooldown(actionId);
    return 1 - remaining / trigger.cooldown;
  }

  getHoldProgress(actionId: string): number {
    const trigger = ABILITY_TRIGGERS[actionId];
    const state = this.states.get(actionId);
    if (!trigger || !state) return 0;

    return Math.min(1, state.holdTime / trigger.holdTime);
  }

  getCurrentValue(actionId: string): number {
    return this.states.get(actionId)?.lastValue ?? 0;
  }

  isReady(actionId: string): boolean {
    return this.getCooldown(actionId) === 0;
  }

  reset(): void {
    for (const id of Object.keys(ABILITY_TRIGGERS)) {
      this.states.set(id, { cooldown: 0, holdTime: 0, lastValue: 0 });
      this.fatigue.set(id, { count: 0, penalty: 0, lastUse: 0 });
    }
  }

  setCooldown(actionId: string, cooldownMs: number): void {
    const state = this.states.get(actionId);
    if (state) {
      state.cooldown = cooldownMs;
    }
  }

  getAllStates(): Record<
    string,
    {
      cooldown: number;
      cooldownMax: number;
      fatigue: number;
      holdProgress: number;
      currentValue: number;
      threshold: number;
      isReady: boolean;
    }
  > {
    const result: Record<string, any> = {};

    for (const [id, trigger] of Object.entries(ABILITY_TRIGGERS)) {
      result[id] = {
        cooldown: this.getCooldown(id),
        cooldownMax: trigger.cooldown,
        fatigue: this.getFatigue(id),
        holdProgress: this.getHoldProgress(id),
        currentValue: this.getCurrentValue(id),
        threshold: trigger.threshold,
        isReady: this.isReady(id),
      };
    }

    return result;
  }
}
