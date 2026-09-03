/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Asteroid,
  BossEntity,
  BotDifficulty,
  EnemyShip,
  GAME_HEIGHT,
  GAME_WIDTH,
  PowerUpItem,
  Ship,
} from '../types';

export interface DroneControlOutput {
  thrust: boolean;
  reverse: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  fire: boolean;
  stateDesc: string;
}

export class TacticalDroneAI {
  private lastFireDecisionTime: number = 0;
  private jitterAngle: number = 0;
  private jitterTimer: number = 0;

  public update(
    bot: Ship,
    p1: Ship,
    asteroids: Asteroid[],
    enemies: EnemyShip[],
    boss: BossEntity | null,
    powerUps: PowerUpItem[],
    difficulty: BotDifficulty,
    currentTime: number
  ): DroneControlOutput {
    if (!bot.isAlive) {
      return {
        thrust: false,
        reverse: false,
        rotateLeft: false,
        rotateRight: false,
        fire: false,
        stateDesc: 'Respawning',
      };
    }

    const isEasy = difficulty === 'easy' || difficulty === 'novice';
    const isHard = difficulty === 'hard' || difficulty === 'ace';

    // Update Jitter for lower difficulties
    this.jitterTimer++;
    if (this.jitterTimer % (isEasy ? 40 : 80) === 0) {
      const maxJitter = isEasy ? 0.35 : isHard ? 0.02 : 0.1;
      this.jitterAngle = (Math.random() - 0.5) * maxJitter;
    }

    // 1. Calculate Distance to Player 1 (Wingman Co-op formation)
    const p1Dist = p1.isAlive ? Math.hypot(bot.x - p1.x, bot.y - p1.y) : 9999;
    const p1Angle = p1.isAlive ? Math.atan2(p1.y - bot.y, p1.x - bot.x) : 0;

    // 2. Incoming Asteroid Hazard Detection
    const threatDistance = isEasy ? 130 : isHard ? 260 : 190;
    let closestHazard: Asteroid | null = null;
    let minHazardDist = threatDistance;

    for (const a of asteroids) {
      const dist = Math.hypot(bot.x - a.x, bot.y - a.y);
      if (dist < minHazardDist) {
        // Project if collision is imminent
        const futureX = a.x + a.vx * 15;
        const futureY = a.y + a.vy * 15;
        const botFutureX = bot.x + bot.vx * 15;
        const botFutureY = bot.y + bot.vy * 15;
        const futureDist = Math.hypot(botFutureX - futureX, botFutureY - futureY);

        if (dist < a.radius + bot.radius + 60 || futureDist < a.radius + bot.radius + 40) {
          closestHazard = a;
          minHazardDist = dist;
        }
      }
    }

    // Dynamic Asteroid Shielding for Hard Difficulty
    const hasShield = bot.buffs.some(b => b.type === 'shield') || currentTime < bot.invulnerableUntil;
    let isShieldingP1 = false;
    if (isHard && hasShield && p1.isAlive && closestHazard) {
      const asteroidToP1Dist = Math.hypot(closestHazard.x - p1.x, closestHazard.y - p1.y);
      if (asteroidToP1Dist < 200) {
        isShieldingP1 = true;
      }
    }

    // 3. Power-Up Intercept Evaluation
    let targetPowerUp: PowerUpItem | null = null;
    let maxPowerUpScore = -1;

    for (const p of powerUps) {
      const distToBot = Math.hypot(bot.x - p.x, bot.y - p.y);
      const distToP1 = p1.isAlive ? Math.hypot(p1.x - p.x, p1.y - p.y) : 9999;

      // If P1 is right next to it (< 90px), let human player take it
      if (p1.isAlive && distToP1 < 90 && distToP1 < distToBot) {
        continue;
      }

      let priority = 10;
      if (p.type === 'repair' && bot.health < 60) priority = 35;
      else if (p.type === 'bomb') priority = 25;
      else if (p.type === 'shield') priority = 22;
      else if (p.type === 'spread' || p.type === 'laserBeam') priority = 20;
      else if (p.type === 'rapidFire') priority = 18;

      const score = (priority * 100) / (distToBot + 50);
      if (score > maxPowerUpScore && distToBot < 420) {
        maxPowerUpScore = score;
        targetPowerUp = p;
      }
    }

    // 4. Hostile Target Acquisition (Enemies or Boss)
    let hostileTarget: { x: number; y: number; vx: number; vy: number; radius: number; isBoss?: boolean } | null = null;
    let minHostileDist = 9999;

    if (boss) {
      hostileTarget = {
        x: boss.x,
        y: boss.y,
        vx: boss.vx,
        vy: boss.vy,
        radius: boss.radius,
        isBoss: true,
      };
      minHostileDist = Math.hypot(bot.x - boss.x, bot.y - boss.y);
    } else {
      // Pick nearest enemy, prioritizing Kamikazes charging in
      for (const e of enemies) {
        const d = Math.hypot(bot.x - e.x, bot.y - e.y);
        const weight = e.type === 'kamikaze' ? 0.6 : 1.0;
        const weightedDist = d * weight;

        if (weightedDist < minHostileDist) {
          minHostileDist = weightedDist;
          hostileTarget = {
            x: e.x,
            y: e.y,
            vx: e.vx,
            vy: e.vy,
            radius: e.radius,
          };
        }
      }
    }

    // If no hostiles, can target closest asteroid to clear path
    if (!hostileTarget && asteroids.length > 0) {
      let nearestA: Asteroid = asteroids[0];
      let nearestDist = 9999;
      for (const a of asteroids) {
        const d = Math.hypot(bot.x - a.x, bot.y - a.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestA = a;
        }
      }
      hostileTarget = {
        x: nearestA.x,
        y: nearestA.y,
        vx: nearestA.vx,
        vy: nearestA.vy,
        radius: nearestA.radius,
      };
    }

    // 5. Behavior Arbitration & Navigation Vector
    let desiredAngle = bot.angle;
    let shouldThrust = false;
    let shouldReverse = false;
    let shouldFire = false;
    let stateDesc = 'Patrolling';

    // Priority A: Hazard Evasion / Shielding
    if (closestHazard && !isShieldingP1) {
      stateDesc = 'Dodging Asteroid';
      const escapeAngle = Math.atan2(bot.y - closestHazard.y, bot.x - closestHazard.x);
      desiredAngle = escapeAngle;
      shouldThrust = true;

      // Defensive fire at the incoming asteroid
      const aimAtHazard = Math.atan2(closestHazard.y - bot.y, closestHazard.x - bot.x);
      const angleDiffToHazard = Math.abs(this.normalizeAngle(aimAtHazard - bot.angle));
      if (angleDiffToHazard < 0.45) {
        shouldFire = true;
      }
    } else if (isShieldingP1 && closestHazard && p1.isAlive) {
      // Bot intercepts to shield Player 1
      stateDesc = 'Shielding Player 1';
      const midpointX = (closestHazard.x + p1.x) / 2;
      const midpointY = (closestHazard.y + p1.y) / 2;
      desiredAngle = Math.atan2(midpointY - bot.y, midpointX - bot.x);
      shouldThrust = true;
      shouldFire = true;
    }
    // Priority B: Snatch Power-Up
    else if (targetPowerUp && (!closestHazard || minHazardDist > 120)) {
      stateDesc = `Grabbing ${targetPowerUp.type === 'repair' ? 'Health' : targetPowerUp.type}`;
      desiredAngle = Math.atan2(targetPowerUp.y - bot.y, targetPowerUp.x - bot.x);
      shouldThrust = true;
    }
    // Priority C: Combat Engagement
    else if (hostileTarget) {
      stateDesc = hostileTarget.isBoss ? 'Attacking Boss' : 'Attacking Enemy';

      // Predictive Aiming Calculation
      const bulletSpeed = 8;
      const dist = Math.hypot(hostileTarget.x - bot.x, hostileTarget.y - bot.y);
      const travelTime = dist / bulletSpeed;

      // Lead calculation based on difficulty
      let leadMult = 1.0;
      if (isEasy) leadMult = 0.3;
      else if (isHard) leadMult = 1.1;
      else leadMult = 0.85;

      const aimX = hostileTarget.x + hostileTarget.vx * travelTime * leadMult;
      const aimY = hostileTarget.y + hostileTarget.vy * travelTime * leadMult;

      const combatAngle = Math.atan2(aimY - bot.y, aimX - bot.x) + this.jitterAngle;
      desiredAngle = combatAngle;

      const angleDiff = Math.abs(this.normalizeAngle(combatAngle - bot.angle));
      const fireThreshold = isHard ? 0.18 : isEasy ? 0.45 : 0.3;

      if (angleDiff < fireThreshold) {
        shouldFire = true;
      }

      // Tactical Positioning: keep combat distance (around 200 - 300px)
      if (dist > 300) {
        shouldThrust = true;
      } else if (dist < 140) {
        shouldReverse = true;
      }

      // Wingman Co-op: don't stray too far from P1
      if (p1.isAlive && p1Dist > 380) {
        desiredAngle = p1Angle;
        shouldThrust = true;
        stateDesc = 'Following Player 1';
      }
    }
    // Priority D: Formation Flight with Player 1
    else if (p1.isAlive) {
      stateDesc = 'Following Player 1';
      if (p1Dist > 250) {
        desiredAngle = p1Angle;
        shouldThrust = true;
      } else if (p1Dist < 80) {
        desiredAngle = p1Angle + Math.PI; // Steer away slightly
        shouldThrust = true;
      }
    }

    // Screen Boundary Avoidance
    const margin = 70;
    if (bot.x < margin) {
      desiredAngle = 0;
      shouldThrust = true;
    } else if (bot.x > GAME_WIDTH - margin) {
      desiredAngle = Math.PI;
      shouldThrust = true;
    } else if (bot.y < margin) {
      desiredAngle = Math.PI / 2;
      shouldThrust = true;
    } else if (bot.y > GAME_HEIGHT - margin) {
      desiredAngle = -Math.PI / 2;
      shouldThrust = true;
    }

    // 6. Angular Steering Outputs
    const angleDiff = this.normalizeAngle(desiredAngle - bot.angle);
    const turnTolerance = isHard ? 0.05 : 0.1;
    let rotateLeft = false;
    let rotateRight = false;

    if (angleDiff > turnTolerance) {
      rotateRight = true;
    } else if (angleDiff < -turnTolerance) {
      rotateLeft = true;
    }

    // Novice bot fire cooldown throttle
    if (difficulty === 'novice') {
      if (currentTime - this.lastFireDecisionTime < 180) {
        shouldFire = false;
      } else if (shouldFire) {
        this.lastFireDecisionTime = currentTime;
      }
    }

    return {
      thrust: shouldThrust,
      reverse: shouldReverse,
      rotateLeft,
      rotateRight,
      fire: shouldFire,
      stateDesc: `${stateDesc} [${difficulty.toUpperCase()}]`,
    };
  }

  private normalizeAngle(angle: number): number {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }
}
