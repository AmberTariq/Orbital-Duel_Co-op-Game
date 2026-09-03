/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

export type PowerUpType = 'speed' | 'rapidFire' | 'shield' | 'spread' | 'bomb' | 'laserBeam' | 'repair';

export interface ActiveBuff {
  type: PowerUpType;
  expiresAt: number; // timestamp
}

export interface Ship extends Entity {
  id: number;
  color: string;
  name: string;
  score: number;
  health: number;
  maxHealth: number;
  lastShot: number;
  isAlive: boolean;
  respawnTimer: number; // seconds until respawn
  invulnerableUntil: number; // shield on respawn
  buffs: ActiveBuff[];
}

export interface Bullet extends Entity {
  ownerId: number; // 1, 2, or negative for enemies
  life: number;
  maxLife: number;
  damage: number;
  isLaser?: boolean;
  isHoming?: boolean;
  targetX?: number;
  targetY?: number;
}

export type AsteroidType = 'normal' | 'explosive' | 'dense' | 'volatile';

export interface Asteroid extends Entity {
  id: string;
  rotationSpeed: number;
  sides: number;
  type: AsteroidType;
  health: number;
  maxHealth: number;
  color: string;
}

export interface PowerUpItem extends Point {
  id: string;
  type: PowerUpType;
  life: number; // frames remaining
  maxLife: number;
  bobOffset: number;
}

export type EnemyType = 'scout' | 'cruiser' | 'kamikaze' | 'gunship';

export interface EnemyShip extends Entity {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  scoreValue: number;
  lastShot: number;
  fireCooldown: number;
  targetPlayerId: number;
  color: string;
  stateTimer: number;
}

export interface BossEntity extends Entity {
  id: string;
  name: string;
  title: string;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  phase: number;
  lastAttack: number;
  attackPattern: number;
  patternTimer: number;
  weakPoints: Point[];
  turrets: { angle: number; lastShot: number }[];
}

export type HazardType = 'none' | 'ionStorm' | 'solarFlare' | 'blackHole';

export interface HazardState {
  type: HazardType;
  active: boolean;
  timer: number;
  intensity: number;
  x?: number;
  y?: number;
  warning: boolean;
}

export interface Particle extends Entity {
  color: string;
  life: number;
  maxLife: number;
  size: number;
  shrink: boolean;
  alpha: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  damage: number;
  ownerId: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface SectorConfig {
  id: number;
  name: string;
  codeName: string;
  subtitle: string;
  bgGradient: [string, string];
  nebulaColor: string;
  gridColor: string;
  asteroidSpeedMult: number;
  asteroidSpawnRate: number;
  hazardType: HazardType;
  hazardName: string;
  hazardDescription: string;
  wavesCount: number;
  bossName: string;
  bossTitle: string;
}

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 675;

export const SHIP_ACCEL = 0.45;
export const SHIP_FRICTION = 0.982;
export const SHIP_ROTATE_SPEED = 0.08;
export const BULLET_SPEED = 8;
export const BULLET_LIFE = 65;
export const DEFAULT_FIRE_RATE = 240; // ms
export const RAPID_FIRE_RATE = 85; // ms

export type GameMode = 'single' | 'multi'; // 'single' = 1 Player (vs Tactical Drone), 'multi' = 2 Players (Local)
export type BotDifficulty = 'easy' | 'normal' | 'hard' | 'novice' | 'tactical' | 'ace';

export interface DebriefStats {
  sectorId: number;
  sectorName: string;
  codeName: string;
  isVictory: boolean;
  isBossDefeated: boolean;
  totalScore: number;
  p1Score: number;
  p2Score: number;
  enemiesDestroyed: number;
  asteroidsDemolished: number;
  bossDamage: number;
  powerUpsCollected: number;
  timeElapsed: number; // in seconds
  rank: 'S' | 'A' | 'B' | 'C';
  rankTitle: string;
  bonusScore: number;
}
