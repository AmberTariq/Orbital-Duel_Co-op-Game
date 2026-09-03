/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import {
  ActiveBuff,
  Asteroid,
  AsteroidType,
  BossEntity,
  Bullet,
  EnemyShip,
  EnemyType,
  FloatingText,
  GAME_HEIGHT,
  GAME_WIDTH,
  HazardState,
  Particle,
  Point,
  PowerUpItem,
  PowerUpType,
  SectorConfig,
  Ship,
  Shockwave,
  DEFAULT_FIRE_RATE,
  RAPID_FIRE_RATE,
  SHIP_ACCEL,
  SHIP_FRICTION,
  SHIP_ROTATE_SPEED,
  BULLET_SPEED,
  BULLET_LIFE,
  GameMode,
  BotDifficulty,
  DebriefStats,
} from '../types';
import { soundEngine } from '../utils/audio';
import { SECTORS } from '../utils/levels';
import { TacticalDroneAI } from '../utils/droneAI';
import { DebriefModal } from './DebriefModal';
import { SettingsModal } from './SettingsModal';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Shield,
  Zap,
  Sparkles,
  AlertTriangle,
  Crosshair,
  Award,
  Bot,
  Cpu,
  Play,
  Flame,
  HeartPulse,
  Bomb,
  Gamepad2,
  Settings,
  Skull,
  Trophy,
  Home,
  Users,
  Ship as ShipIcon,
} from 'lucide-react';

const INITIAL_SHIPS: Ship[] = [
  {
    id: 1,
    name: 'PLAYER 1',
    color: '#00e5ff', // Neon Cyan
    x: 350,
    y: 400,
    vx: 0,
    vy: 0,
    radius: 16,
    angle: -Math.PI / 2,
    score: 0,
    health: 100,
    maxHealth: 100,
    lastShot: 0,
    isAlive: true,
    respawnTimer: 0,
    invulnerableUntil: Date.now() + 3000,
    buffs: [],
  },
  {
    id: 2,
    name: 'PLAYER 2',
    color: '#ff2a8d', // Neon Pink
    x: 850,
    y: 400,
    vx: 0,
    vy: 0,
    radius: 16,
    angle: -Math.PI / 2,
    score: 0,
    health: 100,
    maxHealth: 100,
    lastShot: 0,
    isAlive: true,
    respawnTimer: 0,
    invulnerableUntil: Date.now() + 3000,
    buffs: [],
  },
];

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export interface GameCanvasProps {
  gameMode?: GameMode;
  botDifficulty?: BotDifficulty;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onModeChange?: (mode: GameMode) => void;
  onDifficultyChange?: (diff: BotDifficulty) => void;
  isSettingsOpen?: boolean;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  onScoreUpdate?: (p1Score: number, p2Score: number, totalScore: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode = 'single',
  botDifficulty = 'tactical',
  isMuted: propIsMuted,
  onToggleMute,
  onModeChange,
  onDifficultyChange,
  isSettingsOpen: isSettingsOpenProp,
  onOpenSettings,
  onCloseSettings,
  onScoreUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gameplay State
  const [sectorIndex, setSectorIndex] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);
  const [waveState, setWaveState] = useState<'incoming' | 'active' | 'boss_incoming' | 'boss_fight' | 'sector_cleared' | 'game_over' | 'victory'>('incoming');
  const [waveAnnouncement, setWaveAnnouncement] = useState('LEVEL 1 - WAVE 1: ENEMIES INCOMING');
  const [isMainMenu, setIsMainMenu] = useState(true);
  const isMainMenuRef = useRef(true);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const screenShakeRef = useRef(0);
  const announcementTimerRef = useRef(180);
  const waveAnnouncementRef = useRef('LEVEL 1 - WAVE 1: ENEMIES INCOMING');
  const lastHudSyncRef = useRef(0);
  const [warpProgress, setWarpProgress] = useState(0);

  useEffect(() => {
    isMainMenuRef.current = isMainMenu;
  }, [isMainMenu]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const triggerScreenShake = useCallback((amount: number) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, amount);
  }, []);

  const triggerAnnouncement = useCallback((text: string, duration: number = 180) => {
    waveAnnouncementRef.current = text;
    announcementTimerRef.current = duration;
    setWaveAnnouncement(text);
  }, []);

  // Settings & Field Guide Modal State
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const isSettingsActive = isSettingsOpenProp !== undefined ? isSettingsOpenProp : internalSettingsOpen;

  const handleOpenSettings = useCallback(() => {
    setIsPaused(true);
    onOpenSettings?.();
    setInternalSettingsOpen(true);
  }, [onOpenSettings]);

  const handleCloseSettings = useCallback(() => {
    if (!isMainMenu) {
      setIsPaused(false);
    }
    onCloseSettings?.();
    setInternalSettingsOpen(false);
  }, [onCloseSettings, isMainMenu]);

  const toggleSettings = useCallback(() => {
    if (isSettingsActive) {
      handleCloseSettings();
    } else {
      handleOpenSettings();
    }
  }, [isSettingsActive, handleCloseSettings, handleOpenSettings]);

  useEffect(() => {
    if (isSettingsOpenProp) {
      setIsPaused(true);
    }
  }, [isSettingsOpenProp]);

  // Debrief Modal & Stats
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [debriefStats, setDebriefStats] = useState<DebriefStats | null>(null);

  // Tactical Drone State & AI Ref
  const [droneStatus, setDroneStatus] = useState<string>('Patrolling');
  const droneAIRef = useRef(new TacticalDroneAI());

  // Session Statistics Ref for Combat Debrief
  const sessionStatsRef = useRef({
    enemiesDestroyed: 0,
    asteroidsDemolished: 0,
    bossDamage: 0,
    powerUpsCollected: 0,
    sectorStartTime: Date.now(),
  });

  // Keep Audio Mute State in sync with SoundEngine
  useEffect(() => {
    const unsub = soundEngine.subscribeMute(muted => {
      setIsMuted(muted);
    });
    return unsub;
  }, []);

  // Entities stored in Refs for 60fps physics accuracy without React re-render lag
  const shipsRef = useRef<Ship[]>(JSON.parse(JSON.stringify(INITIAL_SHIPS)));
  const bulletsRef = useRef<Bullet[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const enemiesRef = useRef<EnemyShip[]>([]);
  const bossRef = useRef<BossEntity | null>(null);
  const powerUpsRef = useRef<PowerUpItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<Star[]>([]);
  const hazardRef = useRef<HazardState>({
    type: 'none',
    active: false,
    timer: 0,
    intensity: 0,
    warning: false,
  });

  // UI Mirror state (updated at lower interval for buttery React HUD)
  const [hudState, setHudState] = useState<{
    p1: { health: number; score: number; isAlive: boolean; respawnTimer: number; isShielded: boolean; buffs: ActiveBuff[] };
    p2: { health: number; score: number; isAlive: boolean; respawnTimer: number; isShielded: boolean; buffs: ActiveBuff[] };
    boss: { name: string; title: string; health: number; maxHealth: number; shield: number; maxShield: number } | null;
    enemiesLeft: number;
  }>({
    p1: { health: 100, score: 0, isAlive: true, respawnTimer: 0, isShielded: false, buffs: [] },
    p2: { health: 100, score: 0, isAlive: true, respawnTimer: 0, isShielded: false, buffs: [] },
    boss: null,
    enemiesLeft: 0,
  });

  const keys = useRef<Set<string>>(new Set());
  const currentSector = SECTORS[sectorIndex] || SECTORS[0];

  // Initialize Background Stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 1.8 : 2.5,
        speed: 0.2 + Math.random() * 0.8,
        alpha: 0.2 + Math.random() * 0.8,
      });
    }
    starsRef.current = stars;
  }, []);

  // Spawn Asteroid Helper
  const spawnAsteroid = useCallback((forceType?: AsteroidType, customRadius?: number, origin?: Point): Asteroid => {
    let x = 0;
    let y = 0;
    if (origin) {
      x = origin.x;
      y = origin.y;
    } else {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = Math.random() * GAME_WIDTH; y = -40; }
      else if (side === 1) { x = GAME_WIDTH + 40; y = Math.random() * GAME_HEIGHT; }
      else if (side === 2) { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + 40; }
      else { x = -40; y = Math.random() * GAME_HEIGHT; }
    }

    const angle = origin ? Math.random() * Math.PI * 2 : Math.atan2(GAME_HEIGHT / 2 - y, GAME_WIDTH / 2 - x) + (Math.random() - 0.5) * 0.8;
    const baseSpeed = (1 + Math.random() * 1.8) * currentSector.asteroidSpeedMult;
    const radius = customRadius || (18 + Math.random() * 26);

    let type: AsteroidType = forceType || 'normal';
    if (!forceType) {
      const rand = Math.random();
      if (currentSector.id >= 2 && rand < 0.25) type = 'explosive';
      else if (currentSector.id >= 3 && rand < 0.45) type = 'volatile';
      else if (rand < 0.2) type = 'dense';
    }

    let color = '#94a3b8';
    let health = 2;
    if (type === 'explosive') {
      color = '#f97316'; // orange flame
      health = 1;
    } else if (type === 'dense') {
      color = '#38bdf8'; // blue crystal
      health = 4;
    } else if (type === 'volatile') {
      color = '#ef4444'; // deep red
      health = 2;
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      radius,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      sides: 6 + Math.floor(Math.random() * 4),
      type,
      health,
      maxHealth: health,
      color,
    };
  }, [currentSector]);

  // Spawn Enemy Helper
  const spawnEnemy = useCallback((type: EnemyType, spawnX?: number, spawnY?: number): EnemyShip => {
    let x = spawnX ?? (Math.random() < 0.5 ? -30 : GAME_WIDTH + 30);
    let y = spawnY ?? (50 + Math.random() * (GAME_HEIGHT - 200));

    let health = 30;
    let color = '#ef4444';
    let scoreValue = 100;
    let radius = 18;
    let fireCooldown = 2200;

    if (type === 'scout') {
      health = 25;
      color = '#f87171';
      scoreValue = 80;
      radius = 16;
      fireCooldown = 1800;
    } else if (type === 'cruiser') {
      health = 70;
      color = '#c084fc'; // purple
      scoreValue = 200;
      radius = 24;
      fireCooldown = 2600;
    } else if (type === 'kamikaze') {
      health = 35;
      color = '#fb923c'; // fiery orange
      scoreValue = 150;
      radius = 14;
      fireCooldown = 999999;
    } else if (type === 'gunship') {
      health = 130;
      color = '#e11d48'; // deep crimson
      scoreValue = 350;
      radius = 30;
      fireCooldown = 3200;
    }

    const angleToCenter = Math.atan2(GAME_HEIGHT / 2 - y, GAME_WIDTH / 2 - x);
    const enterSpeed = type === 'kamikaze' ? 2.6 : 1.5;

    return {
      id: Math.random().toString(36).substring(2, 9),
      type,
      x,
      y,
      vx: Math.cos(angleToCenter) * enterSpeed,
      vy: Math.sin(angleToCenter) * enterSpeed,
      radius,
      angle: angleToCenter,
      health,
      maxHealth: health,
      scoreValue,
      lastShot: Date.now() + Math.random() * 1000,
      fireCooldown,
      targetPlayerId: Math.random() < 0.5 ? 1 : 2,
      color,
      stateTimer: 0,
    };
  }, []);

  // Spawn Power-Up Helper
  const spawnPowerUp = useCallback((x: number, y: number, specificType?: PowerUpType) => {
    const types: PowerUpType[] = ['rapidFire', 'shield', 'spread', 'bomb', 'laserBeam', 'repair', 'speed'];
    const chosenType = specificType || types[Math.floor(Math.random() * types.length)];

    powerUpsRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      type: chosenType,
      life: 650, // approx 11 seconds
      maxLife: 650,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }, []);

  // Add Particle Helper
  const addExplosionParticles = useCallback((x: number, y: number, color: string, count: number = 16, maxSpeed: number = 4) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random()) * maxSpeed;
      const life = 20 + Math.floor(Math.random() * 25);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        angle: 0,
        color,
        life,
        maxLife: life,
        size: 2 + Math.random() * 3,
        shrink: true,
        alpha: 1,
      });
    }
  }, []);

  // Add Floating Text Helper
  const addFloatingText = useCallback((x: number, y: number, text: string, color: string = '#ffffff') => {
    floatingTextsRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      text,
      color,
      life: 45,
    });
  }, []);

  // Trigger Screen Clearing EMP Bomb
  const triggerEMPBomb = useCallback((originX: number, originY: number, ownerId: number) => {
    soundEngine.playEMP();
    triggerScreenShake(20);

    shockwavesRef.current.push({
      x: originX,
      y: originY,
      radius: 10,
      maxRadius: 750,
      color: '#c084fc',
      alpha: 1,
      damage: 250,
      ownerId,
    });

    // Clear all enemy bullets immediately
    bulletsRef.current = bulletsRef.current.filter(b => b.ownerId > 0);

    // Vaporize weak asteroids and damage enemies
    asteroidsRef.current.forEach(a => {
      a.health = 0;
      addExplosionParticles(a.x, a.y, a.color, 12, 5);
    });

    enemiesRef.current.forEach(e => {
      e.health -= 200;
      addExplosionParticles(e.x, e.y, e.color, 20, 6);
      if (e.health <= 0) {
        // Award score to bomb collector
        const ship = shipsRef.current.find(s => s.id === ownerId);
        if (ship) ship.score += e.scoreValue;
      }
    });

    // Damage Boss
    if (bossRef.current) {
      if (bossRef.current.shield > 0) {
        bossRef.current.shield = Math.max(0, bossRef.current.shield - 200);
      } else {
        bossRef.current.health = Math.max(0, bossRef.current.health - 150);
      }
      addExplosionParticles(bossRef.current.x, bossRef.current.y, '#c084fc', 30, 8);
    }

    addFloatingText(originX, originY - 20, 'EMP SHOCKWAVE DETONATED!', '#c084fc');
  }, [addExplosionParticles, addFloatingText]);

  // Start a specific Wave or Boss
  const startWave = useCallback((sectorIdx: number, waveNum: number) => {
    const sector = SECTORS[sectorIdx];
    const isBoss = waveNum > sector.wavesCount;

    if (isBoss) {
      setWaveState('boss_incoming');
      triggerAnnouncement(`WARNING: BOSS APPROACHING!`, 200);
      soundEngine.playBossAlarm();
      triggerScreenShake(15);

      // Spawn Boss
      setTimeout(() => {
        bossRef.current = {
          id: 'boss-entity',
          name: sector.bossName,
          title: sector.bossTitle,
          x: GAME_WIDTH / 2,
          y: -100,
          vx: 0,
          vy: 1.2,
          radius: 65,
          angle: Math.PI / 2,
          health: 1200 + sectorIdx * 600,
          maxHealth: 1200 + sectorIdx * 600,
          shield: 500 + sectorIdx * 300,
          maxShield: 500 + sectorIdx * 300,
          phase: 1,
          lastAttack: Date.now() + 1500,
          attackPattern: 0,
          patternTimer: 0,
          weakPoints: [
            { x: -35, y: -10 },
            { x: 35, y: -10 },
            { x: 0, y: 30 },
          ],
          turrets: [
            { angle: -Math.PI / 4, lastShot: 0 },
            { angle: Math.PI / 4, lastShot: 0 },
            { angle: -Math.PI / 2, lastShot: 0 },
            { angle: Math.PI / 2, lastShot: 0 },
          ],
        };
        setWaveState('boss_fight');
      }, 3000);
    } else {
      setWaveState('incoming');
      triggerAnnouncement(`LEVEL ${sectorIdx + 1} - WAVE ${waveNum}: ENEMIES INCOMING`, 160);

      // Spawn appropriate enemies for this wave
      const enemyList: EnemyShip[] = [];
      const scoutCount = 2 + waveNum * 2 + sectorIdx;
      const cruiserCount = waveNum >= 2 ? 1 + sectorIdx : 0;
      const kamikazeCount = sectorIdx >= 1 ? 1 + waveNum : 0;
      const gunshipCount = waveNum >= 3 ? 1 : 0;

      for (let i = 0; i < scoutCount; i++) {
        enemyList.push(spawnEnemy('scout', (i % 2 === 0 ? -40 : GAME_WIDTH + 40), 60 + i * 40));
      }
      for (let i = 0; i < cruiserCount; i++) {
        enemyList.push(spawnEnemy('cruiser', 100 + i * 300, -50));
      }
      for (let i = 0; i < kamikazeCount; i++) {
        enemyList.push(spawnEnemy('kamikaze', 200 + i * 200, -60));
      }
      for (let i = 0; i < gunshipCount; i++) {
        enemyList.push(spawnEnemy('gunship', GAME_WIDTH / 2, -80));
      }

      enemiesRef.current = enemyList;
      setHudState(prev => ({ ...prev, enemiesLeft: enemyList.length }));
      setTimeout(() => setWaveState('active'), 2500);
    }
  }, [spawnEnemy, triggerAnnouncement, triggerScreenShake]);

  // Advance Sector
  const advanceSector = useCallback(() => {
    soundEngine.playWarp();
    setWarpProgress(1);
    setWaveState('sector_cleared');
    triggerAnnouncement(`LEVEL ${sectorIndex + 1} CLEARED! WARPING TO NEXT LEVEL`, 220);

    setTimeout(() => {
      setSectorIndex(prev => {
        const nextIdx = prev + 1;
        if (nextIdx >= SECTORS.length) {
          setWaveState('victory');
          triggerAnnouncement(`VICTORY! ALL LEVELS CLEARED`, 260);
          return prev;
        } else {
          setCurrentWave(1);
          sessionStatsRef.current = {
            enemiesDestroyed: 0,
            asteroidsDemolished: 0,
            bossDamage: 0,
            powerUpsCollected: 0,
            sectorStartTime: Date.now(),
          };
          // Clear remaining entities
          bulletsRef.current = [];
          asteroidsRef.current = [];
          enemiesRef.current = [];
          bossRef.current = null;
          // Heal surviving players slightly on warp
          shipsRef.current.forEach(s => {
            if (s.isAlive) s.health = Math.min(s.maxHealth, s.health + 40);
          });
          startWave(nextIdx, 1);
          return nextIdx;
        }
      });
      setWarpProgress(0);
    }, 3200);
  }, [startWave, sectorIndex, triggerAnnouncement]);

  // Restart Entire Game
  const restartGame = useCallback(() => {
    shipsRef.current = JSON.parse(JSON.stringify(INITIAL_SHIPS));
    bulletsRef.current = [];
    const initialAsteroids: Asteroid[] = [];
    for (let i = 0; i < 5; i++) {
      initialAsteroids.push(spawnAsteroid());
    }
    asteroidsRef.current = initialAsteroids;
    enemiesRef.current = [];
    bossRef.current = null;
    powerUpsRef.current = [];
    particlesRef.current = [];
    shockwavesRef.current = [];
    floatingTextsRef.current = [];
    sessionStatsRef.current = {
      enemiesDestroyed: 0,
      asteroidsDemolished: 0,
      bossDamage: 0,
      powerUpsCollected: 0,
      sectorStartTime: Date.now(),
    };
    setSectorIndex(0);
    setCurrentWave(1);
    setWaveState('incoming');
    startWave(0, 1);
  }, [startWave, spawnAsteroid]);

  // Start Game from Main Menu
  const startGame = useCallback(() => {
    soundEngine.init();
    soundEngine.playPowerUp();
    isMainMenuRef.current = false;
    isPausedRef.current = false;
    setIsMainMenu(false);
    setIsPaused(false);
    restartGame();
  }, [restartGame]);

  // Return to Main Menu
  const returnToMenu = useCallback(() => {
    isMainMenuRef.current = true;
    isPausedRef.current = false;
    setIsMainMenu(true);
    setIsPaused(false);
    setIsDebriefOpen(false);
    setInternalSettingsOpen(false);
    onCloseSettings?.();
    bulletsRef.current = [];
    enemiesRef.current = [];
    bossRef.current = null;
    powerUpsRef.current = [];
    particlesRef.current = [];
    shockwavesRef.current = [];
    shipsRef.current = JSON.parse(JSON.stringify(INITIAL_SHIPS));
    setWaveState('incoming');
  }, [onCloseSettings]);

  // Debrief Action Handlers
  const handleProceedDebrief = useCallback(() => {
    setIsDebriefOpen(false);
    if (sectorIndex >= SECTORS.length - 1) {
      restartGame();
    } else {
      advanceSector();
    }
  }, [sectorIndex, advanceSector, restartGame]);

  const handleRestartDebrief = useCallback(() => {
    setIsDebriefOpen(false);
    restartGame();
  }, [restartGame]);

  // Keyboard and Focus Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      // Space or Enter on Main Menu or Game Over / Victory
      if (e.code === 'Space' || e.code === 'Enter') {
        if (isMainMenuRef.current) {
          e.preventDefault();
          startGame();
          return;
        }
        if (waveState === 'game_over' || waveState === 'victory') {
          e.preventDefault();
          restartGame();
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'Tab') {
        e.preventDefault();
        toggleSettings();
        return;
      }
      if (e.code === 'KeyP') {
        if (!isMainMenuRef.current) {
          e.preventDefault();
          setIsPaused(prev => {
            const next = !prev;
            isPausedRef.current = next;
            return next;
          });
        }
        return;
      }
      if (e.code === 'KeyM') {
        const nextMuted = soundEngine.toggleMute();
        setIsMuted(nextMuted);
        onToggleMute?.();
        return;
      }
      keys.current.add(e.code);
      if (e.key) {
        keys.current.add(e.key.toLowerCase());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      if (e.key) {
        keys.current.delete(e.key.toLowerCase());
      }
    };

    const handleBlur = () => {
      // Clear held keys on blur so ships don't drift uncontrollably
      keys.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [toggleSettings, waveState, startGame, restartGame, onToggleMute]);

  // Initial ambient background setup
  useEffect(() => {
    // Seed initial drifting asteroids for background visual depth
    for (let i = 0; i < 5; i++) {
      asteroidsRef.current.push(spawnAsteroid());
    }
  }, [spawnAsteroid]);

  // Main 60 FPS Game Loop
  useGameLoop((deltaTime: number) => {
    if (isPausedRef.current) return;

    // Decay Screen Shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.8);
    }

    // Announcement timer countdown
    if (announcementTimerRef.current > 0) {
      announcementTimerRef.current -= 1;
    }

    // 1. Move Background Stars
    starsRef.current.forEach(star => {
      star.y += star.speed * (warpProgress > 0 ? 18 : 1);
      if (star.y > GAME_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GAME_WIDTH;
      }
    });

    // In Main Menu mode, gently drift background asteroids and skip active combat
    if (isMainMenuRef.current) {
      asteroidsRef.current.forEach(a => {
        a.x += a.vx * 0.4;
        a.y += a.vy * 0.4;
        a.angle += a.rotationSpeed;
        if (a.x < -60) a.x = GAME_WIDTH + 60;
        if (a.x > GAME_WIDTH + 60) a.x = -60;
        if (a.y < -60) a.y = GAME_HEIGHT + 60;
        if (a.y > GAME_HEIGHT + 60) a.y = -60;
      });
      return;
    }

    // 2. Handle Environmental Hazards
    const hazard = hazardRef.current;
    hazard.timer += 1;

    if (currentSector.hazardType === 'ionStorm') {
      // Periodic Ion lightning discharge
      if (hazard.timer % 320 === 0) {
        hazard.warning = true;
        hazard.x = 100 + Math.random() * (GAME_WIDTH - 200);
      }
      if (hazard.timer % 320 === 60 && hazard.warning) {
        hazard.active = true;
        soundEngine.playLaser();
        triggerScreenShake(8);

        // Strike lightning column
        const strikeX = hazard.x || GAME_WIDTH / 2;
        shipsRef.current.forEach(ship => {
          if (ship.isAlive && Math.abs(ship.x - strikeX) < 45) {
            const hasShield = ship.buffs.some(b => b.type === 'shield') || Date.now() < ship.invulnerableUntil;
            if (!hasShield) {
              ship.health = Math.max(0, ship.health - 25);
              addExplosionParticles(ship.x, ship.y, '#38bdf8', 15, 4);
              addFloatingText(ship.x, ship.y - 15, 'ION SHOCK -25', '#38bdf8');
            }
          }
        });
        setTimeout(() => {
          hazard.active = false;
          hazard.warning = false;
        }, 200);
      }
    } else if (currentSector.hazardType === 'solarFlare') {
      // Coronal mass ejection sweeping from top
      if (hazard.timer % 420 === 0) {
        hazard.warning = true;
      }
      if (hazard.timer % 420 === 80 && hazard.warning) {
        hazard.active = true;
        triggerScreenShake(12);
        soundEngine.playExplosion('medium');

        // Heat pulse damages unshielded ships
        shipsRef.current.forEach(ship => {
          if (ship.isAlive) {
            const hasShield = ship.buffs.some(b => b.type === 'shield') || Date.now() < ship.invulnerableUntil;
            if (!hasShield) {
              ship.health = Math.max(0, ship.health - 20);
              addExplosionParticles(ship.x, ship.y, '#f97316', 15, 5);
              addFloatingText(ship.x, ship.y - 15, 'SOLAR RADIATION -20', '#f97316');
            }
          }
        });
        setTimeout(() => {
          hazard.active = false;
          hazard.warning = false;
        }, 350);
      }
    } else if (currentSector.hazardType === 'blackHole') {
      // Constant gravitational pull towards screen center
      const bhX = GAME_WIDTH / 2;
      const bhY = GAME_HEIGHT / 2;
      shipsRef.current.forEach(ship => {
        if (ship.isAlive) {
          const dx = bhX - ship.x;
          const dy = bhY - ship.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 30) {
            const pull = 0.08 * (1 - Math.min(1, dist / 400));
            ship.vx += (dx / dist) * pull;
            ship.vy += (dy / dist) * pull;
          }
        }
      });
      asteroidsRef.current.forEach(a => {
        const dx = bhX - a.x;
        const dy = bhY - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 20) {
          const pull = 0.05 * (1 - Math.min(1, dist / 400));
          a.vx += (dx / dist) * pull;
          a.vy += (dy / dist) * pull;
        }
      });
    }

    // 3. Update Ships (Player 1 & Player 2 / Tactical Drone)
    const now = Date.now();
    let aliveCount = 0;
    let anyThrusting = false;

    shipsRef.current.forEach(ship => {
      // Handle Dead & Respawn
      if (!ship.isAlive) {
        ship.respawnTimer -= deltaTime / 1000;
        if (ship.respawnTimer <= 0) {
          // Respawn!
          ship.isAlive = true;
          ship.health = ship.maxHealth;
          ship.x = ship.id === 1 ? 350 : 850;
          ship.y = 400;
          ship.vx = 0;
          ship.vy = 0;
          ship.invulnerableUntil = now + 4000;
          soundEngine.playPowerUp();
          addFloatingText(ship.x, ship.y - 20, 'PILOT RESPAWNED!', ship.color);
        }
        return;
      }

      aliveCount++;

      // Clean expired buffs
      ship.buffs = ship.buffs.filter(b => b.expiresAt > now);

      // Controls Mapping (P1 vs P2 / Autonomous Drone)
      const isP1 = ship.id === 1;
      const isDrone = !isP1 && gameMode === 'single';

      let isThrusting = false;
      let isBraking = false;
      let isRotatingLeft = false;
      let isRotatingRight = false;
      let isFiring = false;

      if (isP1) {
        const allowArrows = gameMode === 'single';
        isThrusting = keys.current.has('KeyW') || keys.current.has('w') || (allowArrows && (keys.current.has('ArrowUp') || keys.current.has('arrowup')));
        isBraking = keys.current.has('KeyS') || keys.current.has('s') || (allowArrows && (keys.current.has('ArrowDown') || keys.current.has('arrowdown')));
        isRotatingLeft = keys.current.has('KeyA') || keys.current.has('a') || (allowArrows && (keys.current.has('ArrowLeft') || keys.current.has('arrowleft')));
        isRotatingRight = keys.current.has('KeyD') || keys.current.has('d') || (allowArrows && (keys.current.has('ArrowRight') || keys.current.has('arrowright')));
        isFiring = keys.current.has('Space') || keys.current.has(' ') || (allowArrows && (keys.current.has('Enter') || keys.current.has('enter') || keys.current.has('KeyJ') || keys.current.has('j')));
      } else if (isDrone) {
        // Autonomous Tactical Drone AI
        const p1Ship = shipsRef.current[0];
        const droneOutput = droneAIRef.current.update(
          ship,
          p1Ship,
          asteroidsRef.current,
          enemiesRef.current,
          bossRef.current,
          powerUpsRef.current,
          botDifficulty,
          now
        );
        isThrusting = droneOutput.thrust;
        isBraking = droneOutput.reverse;
        isRotatingLeft = droneOutput.rotateLeft;
        isRotatingRight = droneOutput.rotateRight;
        isFiring = droneOutput.fire;
        if (droneStatus !== droneOutput.stateDesc) {
          setDroneStatus(droneOutput.stateDesc);
        }
      } else {
        // 2-Player Local
        isThrusting = keys.current.has('ArrowUp') || keys.current.has('arrowup');
        isBraking = keys.current.has('ArrowDown') || keys.current.has('arrowdown');
        isRotatingLeft = keys.current.has('ArrowLeft') || keys.current.has('arrowleft');
        isRotatingRight = keys.current.has('ArrowRight') || keys.current.has('arrowright');
        isFiring = keys.current.has('Enter') || keys.current.has('enter') || keys.current.has('NumpadEnter');
      }

      if (isThrusting) {
        anyThrusting = true;
      }

      // Speed boost buff check
      const hasSpeed = ship.buffs.some(b => b.type === 'speed');
      const accel = SHIP_ACCEL * (hasSpeed ? 1.45 : 1.0);

      // Rotation & Thrust
      if (isRotatingLeft) ship.angle -= SHIP_ROTATE_SPEED;
      if (isRotatingRight) ship.angle += SHIP_ROTATE_SPEED;

      if (isThrusting) {
        ship.vx += Math.cos(ship.angle) * accel;
        ship.vy += Math.sin(ship.angle) * accel;

        // Add Thruster Particle
        if (Math.random() < 0.8) {
          const flameAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.4;
          particlesRef.current.push({
            x: ship.x - Math.cos(ship.angle) * 12,
            y: ship.y - Math.sin(ship.angle) * 12,
            vx: Math.cos(flameAngle) * (2 + Math.random() * 2),
            vy: Math.sin(flameAngle) * (2 + Math.random() * 2),
            radius: 2,
            angle: 0,
            color: hasSpeed ? '#38bdf8' : isP1 ? '#00e5ff' : '#ff2a8d',
            life: 14,
            maxLife: 14,
            size: 2.5,
            shrink: true,
            alpha: 0.9,
          });
        }
      }

      if (isBraking) {
        // Reverse brake
        ship.vx *= 0.94;
        ship.vy *= 0.94;
      }

      // Friction & Velocity Clamp
      ship.vx *= SHIP_FRICTION;
      ship.vy *= SHIP_FRICTION;
      ship.x += ship.vx;
      ship.y += ship.vy;

      // Screen Boundary Wrap
      if (ship.x < 0) ship.x = GAME_WIDTH;
      if (ship.x > GAME_WIDTH) ship.x = 0;
      if (ship.y < 0) ship.y = GAME_HEIGHT;
      if (ship.y > GAME_HEIGHT) ship.y = 0;

      // Firing Weapons
      const hasRapidFire = ship.buffs.some(b => b.type === 'rapidFire');
      const hasSpread = ship.buffs.some(b => b.type === 'spread');
      const hasLaser = ship.buffs.some(b => b.type === 'laserBeam');
      const fireInterval = hasRapidFire ? RAPID_FIRE_RATE : DEFAULT_FIRE_RATE;

      if (isFiring && now - ship.lastShot > fireInterval) {
        ship.lastShot = now;

        if (hasLaser) {
          // Hyper piercing laser
          soundEngine.playLaser();
          bulletsRef.current.push({
            x: ship.x + Math.cos(ship.angle) * 22,
            y: ship.y + Math.sin(ship.angle) * 22,
            vx: Math.cos(ship.angle) * (BULLET_SPEED * 1.5) + ship.vx * 0.3,
            vy: Math.sin(ship.angle) * (BULLET_SPEED * 1.5) + ship.vy * 0.3,
            radius: 4,
            angle: ship.angle,
            ownerId: ship.id,
            life: BULLET_LIFE,
            maxLife: BULLET_LIFE,
            damage: 45,
            isLaser: true,
          });
        } else if (hasSpread) {
          // 3-way or 5-way spread
          soundEngine.playShoot(ship.id);
          [-0.26, -0.13, 0, 0.13, 0.26].forEach(offsetAngle => {
            const firingAngle = ship.angle + offsetAngle;
            bulletsRef.current.push({
              x: ship.x + Math.cos(firingAngle) * 18,
              y: ship.y + Math.sin(firingAngle) * 18,
              vx: Math.cos(firingAngle) * BULLET_SPEED + ship.vx * 0.2,
              vy: Math.sin(firingAngle) * BULLET_SPEED + ship.vy * 0.2,
              radius: 2.5,
              angle: firingAngle,
              ownerId: ship.id,
              life: BULLET_LIFE - 10,
              maxLife: BULLET_LIFE - 10,
              damage: 15,
            });
          });
        } else {
          // Standard Blaster Dual Cannons
          soundEngine.playShoot(ship.id);
          const perpAngle = ship.angle + Math.PI / 2;
          [-5, 5].forEach(offset => {
            const bx = ship.x + Math.cos(ship.angle) * 18 + Math.cos(perpAngle) * offset;
            const by = ship.y + Math.sin(ship.angle) * 18 + Math.sin(perpAngle) * offset;
            bulletsRef.current.push({
              x: bx,
              y: by,
              vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.2,
              vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.2,
              radius: 2.5,
              angle: ship.angle,
              ownerId: ship.id,
              life: BULLET_LIFE,
              maxLife: BULLET_LIFE,
              damage: 18,
            });
          });
        }
      }
    });

    // Update active thruster sound engine hum
    soundEngine.setThrusterActive(anyThrusting);

    // Both players dead => Game Over
    if (aliveCount === 0 && waveState !== 'game_over') {
      setWaveState('game_over');
      soundEngine.playExplosion('huge');
    }

    // 4. Update Bullets
    bulletsRef.current.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;
    });
    bulletsRef.current = bulletsRef.current.filter(
      b => b.life > 0 && b.x >= -20 && b.x <= GAME_WIDTH + 20 && b.y >= -20 && b.y <= GAME_HEIGHT + 20
    );

    // 5. Update Asteroids
    asteroidsRef.current.forEach(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.rotationSpeed;

      // Screen wrap
      if (a.x < -40) a.x = GAME_WIDTH + 40;
      if (a.x > GAME_WIDTH + 40) a.x = -40;
      if (a.y < -40) a.y = GAME_HEIGHT + 40;
      if (a.y > GAME_HEIGHT + 40) a.y = -40;
    });

    // Random natural asteroid spawns
    if (Math.random() < currentSector.asteroidSpawnRate && asteroidsRef.current.length < 9) {
      asteroidsRef.current.push(spawnAsteroid());
    }

    // 6. Update Enemies
    enemiesRef.current.forEach(enemy => {
      // Target the closest alive player
      let targetShip = shipsRef.current.find(s => s.id === enemy.targetPlayerId && s.isAlive);
      if (!targetShip) {
        targetShip = shipsRef.current.find(s => s.isAlive);
      }

      if (targetShip) {
        const dx = targetShip.x - enemy.x;
        const dy = targetShip.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const targetAngle = Math.atan2(dy, dx);

        // Turn towards player smoothly
        let angleDiff = targetAngle - enemy.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        enemy.angle += angleDiff * 0.05;

        // Behaviors based on enemy type
        if (enemy.type === 'kamikaze') {
          // Aggressive Charge!
          const speed = 3.8;
          enemy.vx = Math.cos(enemy.angle) * speed;
          enemy.vy = Math.sin(enemy.angle) * speed;

          // Kamikaze trail particles
          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              radius: 2.5,
              angle: 0,
              color: '#fb923c',
              life: 15,
              maxLife: 15,
              size: 3,
              shrink: true,
              alpha: 0.8,
            });
          }
        } else if (enemy.type === 'scout') {
          // Swarm & strafe
          const desiredDist = 180;
          const speed = 2.4;
          if (dist > desiredDist) {
            enemy.vx += Math.cos(enemy.angle) * 0.15;
            enemy.vy += Math.sin(enemy.angle) * 0.15;
          } else {
            // Circle around player
            enemy.vx += Math.cos(enemy.angle + Math.PI / 2) * 0.2;
            enemy.vy += Math.sin(enemy.angle + Math.PI / 2) * 0.2;
          }
          enemy.vx *= 0.95;
          enemy.vy *= 0.95;

          // Scout Firing
          if (now - enemy.lastShot > enemy.fireCooldown && dist < 350) {
            enemy.lastShot = now;
            soundEngine.playEnemyShoot();
            bulletsRef.current.push({
              x: enemy.x + Math.cos(enemy.angle) * 15,
              y: enemy.y + Math.sin(enemy.angle) * 15,
              vx: Math.cos(enemy.angle) * 5.5,
              vy: Math.sin(enemy.angle) * 5.5,
              radius: 3,
              angle: enemy.angle,
              ownerId: -1, // enemy bullet
              life: 90,
              maxLife: 90,
              damage: 15,
            });
          }
        } else if (enemy.type === 'cruiser') {
          // Keep distance, snipe with twin lasers
          const desiredDist = 260;
          if (dist > desiredDist) {
            enemy.vx += Math.cos(enemy.angle) * 0.08;
            enemy.vy += Math.sin(enemy.angle) * 0.08;
          } else {
            enemy.vx *= 0.92;
            enemy.vy *= 0.92;
          }

          // Cruiser Firing (Burst of 2)
          if (now - enemy.lastShot > enemy.fireCooldown && dist < 450) {
            enemy.lastShot = now;
            soundEngine.playEnemyShoot();
            [-8, 8].forEach(offset => {
              const perp = enemy.angle + Math.PI / 2;
              bulletsRef.current.push({
                x: enemy.x + Math.cos(enemy.angle) * 20 + Math.cos(perp) * offset,
                y: enemy.y + Math.sin(enemy.angle) * 20 + Math.sin(perp) * offset,
                vx: Math.cos(enemy.angle) * 6,
                vy: Math.sin(enemy.angle) * 6,
                radius: 3.5,
                angle: enemy.angle,
                ownerId: -1,
                life: 95,
                maxLife: 95,
                damage: 20,
              });
            });
          }
        } else if (enemy.type === 'gunship') {
          // Heavy tank, moves slowly, fires spread fan
          enemy.vx += Math.cos(enemy.angle) * 0.05;
          enemy.vy += Math.sin(enemy.angle) * 0.05;
          enemy.vx *= 0.92;
          enemy.vy *= 0.92;

          if (now - enemy.lastShot > enemy.fireCooldown) {
            enemy.lastShot = now;
            soundEngine.playEnemyShoot();
            [-0.3, 0, 0.3].forEach(offset => {
              bulletsRef.current.push({
                x: enemy.x + Math.cos(enemy.angle + offset) * 25,
                y: enemy.y + Math.sin(enemy.angle + offset) * 25,
                vx: Math.cos(enemy.angle + offset) * 4.8,
                vy: Math.sin(enemy.angle + offset) * 4.8,
                radius: 4,
                angle: enemy.angle + offset,
                ownerId: -1,
                life: 100,
                maxLife: 100,
                damage: 22,
              });
            });
          }
        }
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Soft screen boundaries for enemies
      if (enemy.x < 30) enemy.vx += 0.2;
      if (enemy.x > GAME_WIDTH - 30) enemy.vx -= 0.2;
      if (enemy.y < 30) enemy.vy += 0.2;
      if (enemy.y > GAME_HEIGHT - 30) enemy.vy -= 0.2;
    });

    // 7. Update Boss
    const boss = bossRef.current;
    if (boss) {
      // Entrance descent
      if (boss.y < 120) {
        boss.y += boss.vy;
      } else {
        // Boss Battle Movement (horizontal floating patrol)
        boss.stateTimer = (boss.stateTimer || 0) + 0.02;
        boss.x = GAME_WIDTH / 2 + Math.sin(boss.stateTimer) * 220;
        boss.y = 120 + Math.cos(boss.stateTimer * 0.7) * 40;

        // Shield slowly recharges if not damaged recently
        if (boss.shield < boss.maxShield && Math.random() < 0.02) {
          boss.shield += 1;
        }

        // Check phase transitions
        if (boss.health < boss.maxHealth * 0.5 && boss.phase === 1) {
          boss.phase = 2;
          soundEngine.playBossAlarm();
          addFloatingText(boss.x, boss.y, 'PHASE 2: OVERCLOCK ACTIVE!', '#ef4444');
          triggerScreenShake(12);
        }

        // Attack Patterns
        if (now - boss.lastAttack > (boss.phase === 2 ? 1400 : 2200)) {
          boss.lastAttack = now;
          boss.attackPattern = (boss.attackPattern + 1) % 4;

          if (boss.attackPattern === 0) {
            // Circular Bullet Hell Ring
            soundEngine.playEnemyShoot();
            const count = boss.phase === 2 ? 16 : 12;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + boss.stateTimer;
              bulletsRef.current.push({
                x: boss.x + Math.cos(angle) * 50,
                y: boss.y + Math.sin(angle) * 50,
                vx: Math.cos(angle) * 4.2,
                vy: Math.sin(angle) * 4.2,
                radius: 4,
                angle,
                ownerId: -2,
                life: 110,
                maxLife: 110,
                damage: 20,
              });
            }
          } else if (boss.attackPattern === 1) {
            // Targeted Dual Blasters at both players
            soundEngine.playLaser();
            shipsRef.current.forEach(s => {
              if (s.isAlive) {
                const angle = Math.atan2(s.y - boss.y, s.x - boss.x);
                [-0.15, 0.15].forEach(offset => {
                  bulletsRef.current.push({
                    x: boss.x + Math.cos(angle + offset) * 40,
                    y: boss.y + Math.sin(angle + offset) * 40,
                    vx: Math.cos(angle + offset) * 6,
                    vy: Math.sin(angle + offset) * 6,
                    radius: 4.5,
                    angle: angle + offset,
                    ownerId: -2,
                    life: 100,
                    maxLife: 100,
                    damage: 25,
                  });
                });
              }
            });
          } else if (boss.attackPattern === 2) {
            // Spawn Kamikaze Drone Escorts
            if (enemiesRef.current.length < 4) {
              soundEngine.playLaser();
              enemiesRef.current.push(spawnEnemy('kamikaze', boss.x - 40, boss.y + 20));
              enemiesRef.current.push(spawnEnemy('kamikaze', boss.x + 40, boss.y + 20));
              addFloatingText(boss.x, boss.y + 30, 'DRONES LAUNCHED', '#fb923c');
            }
          } else if (boss.attackPattern === 3 && boss.phase === 2) {
            // Super Spiral Barrage
            soundEngine.playLaser();
            for (let i = 0; i < 8; i++) {
              const angle = Math.PI / 4 + (i / 8) * Math.PI;
              bulletsRef.current.push({
                x: boss.x + Math.cos(angle) * 45,
                y: boss.y + Math.sin(angle) * 45,
                vx: Math.cos(angle) * 5.2,
                vy: Math.sin(angle) * 5.2,
                radius: 4,
                angle,
                ownerId: -2,
                life: 120,
                maxLife: 120,
                damage: 25,
              });
            }
          }
        }
      }
    }

    // 8. Update Power-Ups
    powerUpsRef.current.forEach(p => {
      p.life -= 1;
      p.bobOffset += 0.05;
    });
    powerUpsRef.current = powerUpsRef.current.filter(p => p.life > 0);

    // 9. Update Shockwaves
    shockwavesRef.current.forEach(sw => {
      sw.radius += (sw.maxRadius - sw.radius) * 0.12 + 6;
      sw.alpha -= 0.025;
    });
    shockwavesRef.current = shockwavesRef.current.filter(sw => sw.alpha > 0);

    // 10. Update Particles & Floating Text
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.shrink) p.size = Math.max(0.5, (p.life / p.maxLife) * 3);
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    floatingTextsRef.current.forEach(ft => {
      ft.y -= 0.8;
      ft.life -= 1;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

    // 11. Collisions Engine
    checkAllCollisions();

    // 12. Wave / Boss Progression Check
    if (waveState === 'active') {
      if (enemiesRef.current.length === 0) {
        // Wave Cleared!
        soundEngine.playPowerUp();
        addFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'WAVE CLEARED!', '#22c55e');

        const nextWave = currentWave + 1;
        setCurrentWave(nextWave);
        startWave(sectorIndex, nextWave);
      }
    } else if (waveState === 'boss_fight') {
      if (boss && boss.health <= 0) {
        // BOSS DEFEATED!
        soundEngine.playExplosion('huge');
        soundEngine.playBossDefeatFanfare();
        triggerScreenShake(30);
        addExplosionParticles(boss.x, boss.y, '#f59e0b', 80, 10);
        addFloatingText(boss.x, boss.y, 'BOSS ANNIHILATED! +5000', '#fbbf24');

        // Give score to both players
        shipsRef.current.forEach(s => {
          if (s.isAlive) s.score += 5000;
        });

        // Drop multiple powerups
        spawnPowerUp(boss.x - 60, boss.y, 'spread');
        spawnPowerUp(boss.x, boss.y, 'shield');
        spawnPowerUp(boss.x + 60, boss.y, 'rapidFire');

        bossRef.current = null;

        // Calculate combat debrief statistics
        const elapsed = Math.max(1, Math.floor((Date.now() - sessionStatsRef.current.sectorStartTime) / 1000));
        const p1Score = shipsRef.current[0].score;
        const p2Score = shipsRef.current[1].score;
        const totalScore = p1Score + p2Score;
        const isVictory = sectorIndex >= SECTORS.length - 1;

        let rank: 'S' | 'A' | 'B' | 'C' = 'B';
        let rankTitle = 'Tactical Survivor';
        let bonusScore = 800;

        if (elapsed < 90 && sessionStatsRef.current.enemiesDestroyed >= 6) {
          rank = 'S';
          rankTitle = 'Flawless Ace';
          bonusScore = 2500;
        } else if (elapsed < 160) {
          rank = 'A';
          rankTitle = 'Sector Guardian';
          bonusScore = 1500;
        }

        const debrief: DebriefStats = {
          sectorId: currentSector.id,
          sectorName: currentSector.name,
          codeName: currentSector.codeName,
          isVictory,
          isBossDefeated: true,
          totalScore: totalScore + bonusScore,
          p1Score,
          p2Score,
          enemiesDestroyed: sessionStatsRef.current.enemiesDestroyed,
          asteroidsDemolished: sessionStatsRef.current.asteroidsDemolished,
          bossDamage: sessionStatsRef.current.bossDamage,
          powerUpsCollected: sessionStatsRef.current.powerUpsCollected,
          timeElapsed: elapsed,
          rank,
          rankTitle,
          bonusScore,
        };

        setDebriefStats(debrief);
        setIsDebriefOpen(true);
        setWaveState('sector_cleared');
      }
    }

    // 13. Synchronize HUD mirror (throttled to ~50ms to keep 60fps buttery smooth)
    if (now - lastHudSyncRef.current > 50) {
      lastHudSyncRef.current = now;
      const p1Shield = shipsRef.current[0].buffs.some(b => b.type === 'shield') || now < shipsRef.current[0].invulnerableUntil;
      const p2Shield = shipsRef.current[1].buffs.some(b => b.type === 'shield') || now < shipsRef.current[1].invulnerableUntil;

      setHudState({
        p1: {
          health: shipsRef.current[0].health,
          score: shipsRef.current[0].score,
          isAlive: shipsRef.current[0].isAlive,
          respawnTimer: Math.ceil(shipsRef.current[0].respawnTimer),
          isShielded: p1Shield,
          buffs: shipsRef.current[0].buffs,
        },
        p2: {
          health: shipsRef.current[1].health,
          score: shipsRef.current[1].score,
          isAlive: shipsRef.current[1].isAlive,
          respawnTimer: Math.ceil(shipsRef.current[1].respawnTimer),
          isShielded: p2Shield,
          buffs: shipsRef.current[1].buffs,
        },
        boss: bossRef.current ? {
          name: bossRef.current.name,
          title: bossRef.current.title,
          health: bossRef.current.health,
          maxHealth: bossRef.current.maxHealth,
          shield: bossRef.current.shield,
          maxShield: bossRef.current.maxShield,
        } : null,
        enemiesLeft: enemiesRef.current.length,
      });

      onScoreUpdate?.(
        shipsRef.current[0].score,
        shipsRef.current[1].score,
        shipsRef.current[0].score + shipsRef.current[1].score
      );
    }
  });

  // Collision Detection Logic
  const checkAllCollisions = () => {
    const bullets = bulletsRef.current;
    const asteroids = asteroidsRef.current;
    const enemies = enemiesRef.current;
    const ships = shipsRef.current;
    const boss = bossRef.current;
    const powerUps = powerUpsRef.current;
    const now = Date.now();

    // A. Player Bullets vs Asteroids
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (b.ownerId <= 0) continue; // Skip enemy bullets

      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < a.radius + b.radius) {
          // Impact!
          a.health -= b.damage;
          addExplosionParticles(b.x, b.y, a.color, 6, 3);
          if (!b.isLaser) {
            bullets.splice(bi, 1);
          }

          if (a.health <= 0) {
            // Destroy Asteroid
            sessionStatsRef.current.asteroidsDemolished += 1;
            soundEngine.playAsteroidExplosion(a.type, a.radius);
            addExplosionParticles(a.x, a.y, a.color, 16, 5);

            // Award score
            const ship = ships.find(s => s.id === b.ownerId);
            if (ship) ship.score += a.type === 'explosive' ? 50 : 25;

            // Chance to drop powerup
            if (Math.random() < 0.12) {
              spawnPowerUp(a.x, a.y);
            }

            // Split into smaller asteroids if radius is large
            if (a.radius > 20) {
              for (let i = 0; i < 2; i++) {
                asteroids.push(spawnAsteroid(a.type, a.radius / 2, { x: a.x, y: a.y }));
              }
            }

            // Explosive asteroid collateral blast
            if (a.type === 'explosive') {
              soundEngine.playExplosion('medium');
              triggerScreenShake(6);
              shockwavesRef.current.push({
                x: a.x,
                y: a.y,
                radius: 5,
                maxRadius: 100,
                color: '#f97316',
                alpha: 0.8,
                damage: 50,
                ownerId: b.ownerId,
              });
            }

            asteroids.splice(ai, 1);
          }
          break;
        }
      }
    }

    // B. Player Bullets vs Enemies
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (b.ownerId <= 0) continue;

      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (dist < enemy.radius + b.radius) {
          enemy.health -= b.damage;
          addExplosionParticles(b.x, b.y, enemy.color, 8, 3);
          if (!b.isLaser) {
            bullets.splice(bi, 1);
          }

          if (enemy.health <= 0) {
            sessionStatsRef.current.enemiesDestroyed += 1;
            soundEngine.playExplosion('medium');
            addExplosionParticles(enemy.x, enemy.y, enemy.color, 24, 6);
            addFloatingText(enemy.x, enemy.y - 15, `+${enemy.scoreValue}`, '#22c55e');

            const ship = ships.find(s => s.id === b.ownerId);
            if (ship) ship.score += enemy.scoreValue;

            // Powerup drop chance
            if (Math.random() < 0.35) {
              spawnPowerUp(enemy.x, enemy.y);
            }

            enemies.splice(ei, 1);
          }
          break;
        }
      }
    }

    // C. Player Bullets vs Boss
    if (boss) {
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (b.ownerId <= 0) continue;

        const dist = Math.hypot(b.x - boss.x, b.y - boss.y);
        if (dist < boss.radius + b.radius) {
          sessionStatsRef.current.bossDamage += b.damage;
          // Boss Shield Deflection vs Hull Hit
          if (boss.shield > 0) {
            boss.shield -= b.damage;
            soundEngine.playShieldAbsorb();
            addExplosionParticles(b.x, b.y, '#38bdf8', 6, 3);
          } else {
            boss.health -= b.damage;
            soundEngine.playExplosion('small');
            addExplosionParticles(b.x, b.y, '#f59e0b', 8, 4);
          }

          const ship = ships.find(s => s.id === b.ownerId);
          if (ship) ship.score += 15;

          if (!b.isLaser) {
            bullets.splice(bi, 1);
          }
        }
      }
    }

    // D. Enemy Bullets vs Players
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (b.ownerId > 0) continue; // Skip player bullets

      for (let si = 0; si < ships.length; si++) {
        const ship = ships[si];
        if (!ship.isAlive) continue;

        const dist = Math.hypot(b.x - ship.x, b.y - ship.y);
        if (dist < ship.radius + b.radius) {
          const hasShield = ship.buffs.some(buff => buff.type === 'shield') || now < ship.invulnerableUntil;
          if (hasShield) {
            soundEngine.playShieldAbsorb();
            addExplosionParticles(b.x, b.y, '#00e5ff', 8, 3);
            addFloatingText(ship.x, ship.y - 15, 'DEFLECTED', '#00e5ff');
          } else {
            ship.health -= b.damage;
            soundEngine.playExplosion('small');
            triggerScreenShake(6);
            addExplosionParticles(ship.x, ship.y, ship.color, 14, 4);
            addFloatingText(ship.x, ship.y - 15, `-${b.damage}`, '#ef4444');

            if (ship.health <= 0) {
              ship.health = 0;
              ship.isAlive = false;
              ship.respawnTimer = 5; // 5 seconds until respawn
              soundEngine.playShipDestruction();
              triggerScreenShake(15);
              addExplosionParticles(ship.x, ship.y, ship.color, 35, 7);
              addFloatingText(ship.x, ship.y - 20, 'HULL DESTROYED! RESPAWNING...', '#ef4444');
            }
          }
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // E. Asteroids vs Players
    for (let ai = asteroids.length - 1; ai >= 0; ai--) {
      const a = asteroids[ai];
      for (let si = 0; si < ships.length; si++) {
        const ship = ships[si];
        if (!ship.isAlive) continue;

        const dist = Math.hypot(ship.x - a.x, ship.y - a.y);
        if (dist < ship.radius + a.radius) {
          const hasShield = ship.buffs.some(buff => buff.type === 'shield') || now < ship.invulnerableUntil;
          if (hasShield) {
            soundEngine.playShieldAbsorb();
            addExplosionParticles(ship.x, ship.y, '#00e5ff', 12, 4);
          } else {
            ship.health -= 25;
            soundEngine.playExplosion('medium');
            triggerScreenShake(10);
            addExplosionParticles(ship.x, ship.y, ship.color, 20, 5);
            addFloatingText(ship.x, ship.y - 15, '-25 IMPACT', '#ef4444');

            if (ship.health <= 0) {
              ship.health = 0;
              ship.isAlive = false;
              ship.respawnTimer = 5;
              soundEngine.playShipDestruction();
              triggerScreenShake(15);
              addExplosionParticles(ship.x, ship.y, ship.color, 35, 7);
            }
          }
          // Destroy asteroid on collision
          asteroids.splice(ai, 1);
          break;
        }
      }
    }

    // F. Enemies (Kamikaze) vs Players
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const enemy = enemies[ei];
      for (let si = 0; si < ships.length; si++) {
        const ship = ships[si];
        if (!ship.isAlive) continue;

        const dist = Math.hypot(ship.x - enemy.x, ship.y - enemy.y);
        if (dist < ship.radius + enemy.radius) {
          const hasShield = ship.buffs.some(buff => buff.type === 'shield') || now < ship.invulnerableUntil;
          if (hasShield) {
            soundEngine.playShieldAbsorb();
            addExplosionParticles(enemy.x, enemy.y, enemy.color, 20, 5);
          } else {
            ship.health -= 35;
            soundEngine.playExplosion('medium');
            triggerScreenShake(12);
            addExplosionParticles(ship.x, ship.y, ship.color, 20, 5);
            addFloatingText(ship.x, ship.y - 15, '-35 RAM IMPACT', '#ef4444');

            if (ship.health <= 0) {
              ship.health = 0;
              ship.isAlive = false;
              ship.respawnTimer = 5;
              soundEngine.playShipDestruction();
              triggerScreenShake(15);
            }
          }
          enemies.splice(ei, 1);
          break;
        }
      }
    }

    // G. Power-Ups vs Players
    for (let pi = powerUps.length - 1; pi >= 0; pi--) {
      const p = powerUps[pi];
      for (let si = 0; si < ships.length; si++) {
        const ship = ships[si];
        if (!ship.isAlive) continue;

        const dist = Math.hypot(ship.x - p.x, ship.y - p.y);
        if (dist < ship.radius + 20) {
          sessionStatsRef.current.powerUpsCollected += 1;
          soundEngine.playPowerUp(p.type);
          ship.score += 150;

          // Apply Power-up
          if (p.type === 'bomb') {
            triggerEMPBomb(ship.x, ship.y, ship.id);
          } else if (p.type === 'repair') {
            ship.health = Math.min(ship.maxHealth, ship.health + 45);
            addFloatingText(ship.x, ship.y - 20, '+45 REPAIR NANITES', '#22c55e');
            // Give small heal to teammate as co-op synergy!
            const teammate = ships.find(s => s.id !== ship.id);
            if (teammate && teammate.isAlive) {
              teammate.health = Math.min(teammate.maxHealth, teammate.health + 15);
            }
          } else {
            // Buff with duration
            const duration = p.type === 'shield' ? 8000 : 10000;
            ship.buffs = ship.buffs.filter(b => b.type !== p.type);
            ship.buffs.push({
              type: p.type,
              expiresAt: now + duration,
            });

            const labelMap: Record<PowerUpType, string> = {
              rapidFire: 'RAPID FIRE ACTIVE!',
              shield: 'DEFLECTOR SHIELD UP!',
              spread: 'SPREAD SHOT ARMED!',
              laserBeam: 'HYPER LASER CHARGED!',
              speed: 'OVERDRIVE ENGAGED!',
              bomb: 'EMP BOMB',
              repair: 'REPAIR',
            };
            addFloatingText(ship.x, ship.y - 20, labelMap[p.type], '#facc15');
          }

          powerUps.splice(pi, 1);
          break;
        }
      }
    }
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.save();

      // Screen Shake offset
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
      }

      // Background Sector Sky
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGrad.addColorStop(0, currentSector.bgGradient[0]);
      bgGrad.addColorStop(1, currentSector.bgGradient[1]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Procedural Sector Nebula Clouds
      ctx.fillStyle = currentSector.nebulaColor;
      ctx.beginPath();
      ctx.arc(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.4, 280, 0, Math.PI * 2);
      ctx.arc(GAME_WIDTH * 0.75, GAME_HEIGHT * 0.65, 320, 0, Math.PI * 2);
      ctx.fill();

      // Grid Pattern
      ctx.strokeStyle = currentSector.gridColor;
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_WIDTH; x += 44) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < GAME_HEIGHT; y += 44) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); ctx.stroke();
      }

      // Stars (with hyperspace streak effect when warping)
      starsRef.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        if (warpProgress > 0) {
          ctx.strokeStyle = `rgba(180, 220, 255, ${star.alpha * 0.9})`;
          ctx.lineWidth = star.size;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x, star.y + star.speed * 45);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Environmental Hazard Visuals
      const hazard = hazardRef.current;
      if (currentSector.hazardType === 'ionStorm') {
        if (hazard.warning) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(hazard.x || 0, 0);
          ctx.lineTo(hazard.x || 0, GAME_HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (hazard.active) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 18;
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          let lx = hazard.x || 0;
          ctx.moveTo(lx, 0);
          for (let y = 20; y < GAME_HEIGHT; y += 30) {
            lx += (Math.random() - 0.5) * 25;
            ctx.lineTo(lx, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else if (currentSector.hazardType === 'solarFlare') {
        if (hazard.warning) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(0, 0, GAME_WIDTH, 40);
        }
        if (hazard.active) {
          const flareGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
          flareGrad.addColorStop(0, 'rgba(249, 115, 22, 0.85)');
          flareGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.5)');
          flareGrad.addColorStop(1, 'rgba(249, 115, 22, 0.1)');
          ctx.fillStyle = flareGrad;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
      } else if (currentSector.hazardType === 'blackHole') {
        // Render Singularity Accretion Disk
        const bhX = GAME_WIDTH / 2;
        const bhY = GAME_HEIGHT / 2;
        const time = Date.now() * 0.002;
        ctx.save();
        ctx.translate(bhX, bhY);
        ctx.rotate(time);
        const diskGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 85);
        diskGrad.addColorStop(0, '#000000');
        diskGrad.addColorStop(0.3, 'rgba(168, 85, 247, 0.8)');
        diskGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)');
        diskGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 85, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Shockwaves
      shockwavesRef.current.forEach(sw => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Power-Up Items
      powerUpsRef.current.forEach(p => {
        ctx.save();
        const bobY = p.y + Math.sin(p.bobOffset) * 4;
        ctx.translate(p.x, bobY);

        let color = '#38bdf8';
        let label = 'BUFF';
        if (p.type === 'rapidFire') { color = '#f59e0b'; label = 'RAPID'; }
        else if (p.type === 'shield') { color = '#06b6d4'; label = 'SHIELD'; }
        else if (p.type === 'spread') { color = '#22c55e'; label = 'SPREAD'; }
        else if (p.type === 'bomb') { color = '#c084fc'; label = 'EMP'; }
        else if (p.type === 'laserBeam') { color = '#eab308'; label = 'LASER'; }
        else if (p.type === 'repair') { color = '#10b981'; label = 'REPAIR'; }
        else if (p.type === 'speed') { color = '#3b82f6'; label = 'SPEED'; }

        // Glow ring
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Outer Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + p.bobOffset * 0.5;
          const px = Math.cos(ang) * 14;
          const py = Math.sin(ang) * 14;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Label above
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 8px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, -18);

        ctx.restore();
      });

      // Draw Asteroids
      asteroidsRef.current.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);

        ctx.strokeStyle = a.color;
        ctx.lineWidth = 2.5;
        if (a.type === 'explosive' || a.type === 'volatile') {
          ctx.shadowBlur = 15;
          ctx.shadowColor = a.color;
        }

        ctx.beginPath();
        for (let i = 0; i < a.sides; i++) {
          const ang = (i / a.sides) * Math.PI * 2;
          const r = a.radius * (0.8 + 0.2 * Math.sin(i * 3));
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Asteroid core / cracks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(a.radius * 0.4, a.radius * 0.2);
        ctx.moveTo(0, 0);
        ctx.lineTo(-a.radius * 0.3, a.radius * 0.5);
        ctx.stroke();

        ctx.restore();
      });

      // Draw Enemies
      enemiesRef.current.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.angle);

        ctx.shadowBlur = 12;
        ctx.shadowColor = enemy.color;
        ctx.strokeStyle = enemy.color;
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.lineWidth = 2;

        if (enemy.type === 'scout') {
          // Arrowhead interceptor
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-12, 10);
          ctx.lineTo(-6, 0);
          ctx.lineTo(-12, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'cruiser') {
          // Sleek wide cruiser with twin nacelles
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(8, 16);
          ctx.lineTo(-16, 14);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-16, -14);
          ctx.lineTo(8, -16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'kamikaze') {
          // Fiery dart with glowing exhaust
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(-10, 8);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-10, -8);
          ctx.closePath();
          ctx.fillStyle = '#fb923c';
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'gunship') {
          // Heavy armored diamond
          ctx.beginPath();
          ctx.moveTo(26, 0);
          ctx.lineTo(0, 22);
          ctx.lineTo(-24, 12);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-24, -12);
          ctx.lineTo(0, -22);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();

        // Enemy Health Bar
        if (enemy.health < enemy.maxHealth) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 8, 28, 3);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 8, 28 * (enemy.health / enemy.maxHealth), 3);
        }
      });

      // Draw Boss
      const boss = bossRef.current;
      if (boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.rotate(boss.angle);

        // Huge Dreadnought Silhouette
        ctx.shadowBlur = 25;
        ctx.shadowColor = boss.phase === 2 ? '#ef4444' : '#38bdf8';
        ctx.strokeStyle = boss.phase === 2 ? '#ef4444' : '#60a5fa';
        ctx.fillStyle = '#0f172a';
        ctx.lineWidth = 3.5;

        // Armored hull wings
        ctx.beginPath();
        ctx.moveTo(50, 0);
        ctx.lineTo(25, 45);
        ctx.lineTo(-30, 55);
        ctx.lineTo(-50, 25);
        ctx.lineTo(-40, 0);
        ctx.lineTo(-50, -25);
        ctx.lineTo(-30, -55);
        ctx.lineTo(25, -45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Reactor Core
        ctx.fillStyle = boss.phase === 2 ? '#ef4444' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 16 + Math.sin(Date.now() * 0.008) * 3, 0, Math.PI * 2);
        ctx.fill();

        // Shield Dome if shield active
        if (boss.shield > 0) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, boss.radius + 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }

      // Draw Bullets
      bulletsRef.current.forEach(b => {
        ctx.save();
        let color = b.ownerId === 1 ? '#00e5ff' : b.ownerId === 2 ? '#ff2a8d' : '#ef4444';
        if (b.isLaser) color = '#facc15';

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;

        if (b.isLaser) {
          // Long piercing beam
          ctx.translate(b.x, b.y);
          ctx.rotate(b.angle);
          ctx.fillRect(-12, -2, 24, 4);
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Ships (Player 1 & Player 2)
      shipsRef.current.forEach(ship => {
        if (!ship.isAlive) return;

        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        ctx.shadowBlur = 20;
        ctx.shadowColor = ship.color;
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';

        // Sleek fighter fuselage
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-12, 14);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Canopy
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(2, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Active Shield Forcefield rendering
        const hasShield = ship.buffs.some(b => b.type === 'shield') || Date.now() < ship.invulnerableUntil;
        if (hasShield) {
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00e5ff';
          ctx.beginPath();
          ctx.arc(0, 0, ship.radius + 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw Floating Texts
      floatingTextsRef.current.forEach(ft => {
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.font = '700 11px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Announcement Banner Overlay
      if (announcementTimerRef.current > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, GAME_HEIGHT / 2 - 40, GAME_WIDTH, 80);
        ctx.strokeStyle = currentSector.id === 3 ? '#ef4444' : '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, GAME_HEIGHT / 2 - 40, GAME_WIDTH, 80);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 20px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00e5ff';
        ctx.fillText(waveAnnouncementRef.current, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6);
        ctx.restore();
      }

      // Dim canvas background on game over or victory
      if (waveState === 'game_over' || waveState === 'victory') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentSector, waveState, warpProgress]);

  return (
    <div className="relative w-full max-w-[1240px] aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black select-none group flex items-center justify-center">
      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="w-full h-full block cursor-crosshair"
        id="game-canvas"
      />

      {/* FLOATING IN-GAME MINIMALIST HUD OVERLAY (Visible during active gameplay) */}
      {!isMainMenu && (
        <>
          {/* 1. Top-Left Floating Card: Player 1 */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 p-3 rounded-xl bg-black/65 backdrop-blur-md border border-cyan-500/30 shadow-xl min-w-[210px] sm:min-w-[250px] pointer-events-auto transition-all">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold font-mono text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                PLAYER 1 <span className="text-[10px] text-white/40 font-normal hidden sm:inline">[WASD + Space]</span>
              </span>
              <span className="text-sm font-bold text-white font-mono tracking-tight">{hudState.p1.score.toLocaleString()} PTS</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2 bg-black/80 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, hudState.p1.health)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-semibold text-white/80 min-w-[48px] text-right">
                {hudState.p1.isAlive ? `${Math.round(hudState.p1.health)} HP` : `RESPAWN IN: ${hudState.p1.respawnTimer}s`}
              </span>
            </div>

            {/* Shield Status Badge */}
            {hudState.p1.isShielded && (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/40 animate-pulse">
                <Shield size={11} className="fill-cyan-400/40" />
                <span>SHIELD ACTIVE</span>
              </div>
            )}
          </div>

          {/* 2. Top-Right Floating Card: Player 2 / Bot */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 p-3 rounded-xl bg-black/65 backdrop-blur-md border border-pink-500/30 shadow-xl min-w-[210px] sm:min-w-[250px] pointer-events-auto items-end transition-all">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm font-bold text-white font-mono tracking-tight">{hudState.p2.score.toLocaleString()} PTS</span>
              <span className="text-pink-400 font-bold font-mono text-xs flex items-center gap-1.5">
                {gameMode === 'single' ? (
                  <>
                    <Bot size={13} className="text-pink-400" />
                    <span>COMPUTER BOT</span>
                  </>
                ) : (
                  <>
                    <span>PLAYER 2</span>
                    <span className="text-[10px] text-white/40 font-normal hidden sm:inline">[Arrows + Enter]</span>
                  </>
                )}
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shadow-sm shadow-pink-400" />
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full">
              <span className="text-[10px] font-mono font-semibold text-white/80 min-w-[48px]">
                {hudState.p2.isAlive ? `${Math.round(hudState.p2.health)} HP` : `RESPAWN IN: ${hudState.p2.respawnTimer}s`}
              </span>
              <div className="flex-1 h-2 bg-black/80 rounded-full overflow-hidden border border-pink-500/30">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, hudState.p2.health)}%` }}
                />
              </div>
            </div>

            {/* Bot Status or Shield Badge */}
            {gameMode === 'single' ? (
              <div className="flex items-center gap-1 text-[9px] font-mono text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded border border-pink-500/40">
                <span className="text-pink-400/80 font-bold">[{botDifficulty.toUpperCase()}]</span>
                <span className="truncate max-w-[120px]">{droneStatus}</span>
              </div>
            ) : (
              hudState.p2.isShielded && (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-pink-300 font-bold bg-pink-500/20 px-2 py-0.5 rounded border border-pink-400/40 animate-pulse">
                  <Shield size={11} className="fill-pink-400/40" />
                  <span>SHIELD ACTIVE</span>
                </div>
              )
            )}
          </div>

          {/* 3. Top-Center Floating Level Pill & Boss Health Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
            {/* Level & Wave Status Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-lg font-mono text-[11px] text-white pointer-events-auto">
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-[10px]">
                LEVEL {sectorIndex + 1}
              </span>
              <span className="font-semibold text-white/95">{currentSector.name}</span>
              <span className="text-white/30">|</span>
              <span className="text-white/80 font-medium">WAVE {currentWave}/{currentSector.wavesCount}</span>
              {currentSector.hazardType !== 'none' && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-amber-400 flex items-center gap-1 text-[10px] font-medium">
                    <AlertTriangle size={11} />
                    <span className="hidden sm:inline">{currentSector.hazardName}</span>
                  </span>
                </>
              )}
            </div>

            {/* Boss Health Bar Overlay (When Boss is Active) */}
            {hudState.boss && (
              <div className="w-[320px] sm:w-[460px] bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-red-500/40 shadow-2xl animate-in fade-in duration-200 pointer-events-auto">
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <div className="flex items-center gap-1.5">
                    <Crosshair size={13} className="text-red-400" />
                    <span className="text-red-400 font-bold tracking-wider uppercase">{hudState.boss.name}</span>
                    <span className="text-white/40 text-[10px] hidden sm:inline">{hudState.boss.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/80">
                    {Math.max(0, Math.floor(hudState.boss.health))} / {hudState.boss.maxHealth}
                  </span>
                </div>

                <div className="w-full h-2 bg-black/90 rounded-full overflow-hidden border border-red-500/30 mb-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, (hudState.boss.health / hudState.boss.maxHealth) * 100)}%` }}
                  />
                </div>

                {hudState.boss.shield > 0 && (
                  <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden border border-cyan-500/30">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-100"
                      style={{ width: `${(hudState.boss.shield / hudState.boss.maxShield) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Bottom-Center Floating Active Power-Up Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
            {(() => {
              const activeBuffs: { pilot: string; type: PowerUpType; expiresAt: number; totalDuration: number; color: string }[] = [];
              hudState.p1.buffs.forEach(b => {
                activeBuffs.push({
                  pilot: 'P1',
                  type: b.type,
                  expiresAt: b.expiresAt,
                  totalDuration: b.type === 'shield' || b.type === 'laserBeam' ? 8000 : 10000,
                  color: '#00e5ff',
                });
              });
              hudState.p2.buffs.forEach(b => {
                activeBuffs.push({
                  pilot: gameMode === 'single' ? 'BOT' : 'P2',
                  type: b.type,
                  expiresAt: b.expiresAt,
                  totalDuration: b.type === 'shield' || b.type === 'laserBeam' ? 8000 : 10000,
                  color: '#ff2a8d',
                });
              });

              if (activeBuffs.length === 0) return null;

              const now = Date.now();
              return activeBuffs.map((buff, idx) => {
                const remainingMs = Math.max(0, buff.expiresAt - now);
                const percent = Math.min(100, Math.max(0, (remainingMs / buff.totalDuration) * 100));
                const secs = (remainingMs / 1000).toFixed(1);

                let icon = <Zap size={13} className="text-yellow-400" />;
                let label = 'POWER-UP';
                let borderGlow = 'border-yellow-500/40 text-yellow-300';
                let barColor = 'bg-yellow-400';

                if (buff.type === 'rapidFire') {
                  icon = <Flame size={13} className="text-amber-400 animate-pulse" />;
                  label = 'RAPID FIRE';
                  borderGlow = 'border-amber-500/40 text-amber-300';
                  barColor = 'bg-amber-400';
                } else if (buff.type === 'shield') {
                  icon = <Shield size={13} className="text-cyan-400 animate-pulse" />;
                  label = 'SHIELD';
                  borderGlow = 'border-cyan-500/40 text-cyan-300';
                  barColor = 'bg-cyan-400';
                } else if (buff.type === 'spread') {
                  icon = <Crosshair size={13} className="text-emerald-400" />;
                  label = 'SPREAD LASER';
                  borderGlow = 'border-emerald-500/40 text-emerald-300';
                  barColor = 'bg-emerald-400';
                } else if (buff.type === 'laserBeam') {
                  icon = <Sparkles size={13} className="text-yellow-400" />;
                  label = 'HYPER LASER';
                  borderGlow = 'border-yellow-500/40 text-yellow-300';
                  barColor = 'bg-yellow-400';
                } else if (buff.type === 'speed') {
                  icon = <Zap size={13} className="text-blue-400" />;
                  label = 'SPEED BOOST';
                  borderGlow = 'border-blue-500/40 text-blue-300';
                  barColor = 'bg-blue-400';
                }

                return (
                  <div
                    key={`${buff.pilot}-${buff.type}-${idx}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border ${borderGlow} shadow-xl font-mono text-[11px] pointer-events-auto transition-all`}
                  >
                    <span
                      className="text-[9px] px-1.5 py-0.2 rounded font-bold"
                      style={{ backgroundColor: `${buff.color}25`, color: buff.color }}
                    >
                      {buff.pilot}
                    </span>
                    {icon}
                    <span className="font-bold tracking-wider">{label}</span>
                    <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                      <div
                        className={`h-full ${barColor} transition-all duration-75`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/70 min-w-[24px]">{secs}s</span>
                  </div>
                );
              });
            })()}
          </div>

          {/* 5. Bottom Corner Information */}
          <div className="absolute bottom-3 left-4 z-20 hidden sm:flex items-center gap-3 text-[10px] font-mono text-white/40 pointer-events-none">
            <span className="bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/5">
              [ESC] How to Play · [P] Pause · [M] Sound
            </span>
          </div>

          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5 text-white/70">
              <span className="text-white/40">ENEMIES:</span>
              <span className="text-red-400 font-bold">{hudState.enemiesLeft} SHIPS</span>
            </div>
          </div>
        </>
      )}

      {/* 0. WELCOMING MAIN MENU SCREEN OVERLAY */}
      {isMainMenu && !isSettingsActive && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 pointer-events-auto">
          {/* Animated Arcade Logo */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-0.5 shadow-2xl shadow-cyan-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-black/70 rounded-[14px] flex items-center justify-center">
                <ShipIcon className="text-cyan-400 fill-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" size={32} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 mb-1 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            ORBITAL DUEL
          </h1>
          <p className="text-xs sm:text-sm font-mono text-cyan-200/70 mb-6">
            Retro Arcade Co-Op Space Shooter
          </p>

          {/* Mode & Difficulty Selector Card */}
          <div className="w-full max-w-md bg-black/60 border border-white/15 rounded-2xl p-4 sm:p-5 mb-5 space-y-4 backdrop-blur-sm shadow-xl">
            <div>
              <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider mb-2 text-left">
                Select Game Mode
              </div>
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <button
                  onClick={() => onModeChange?.('single')}
                  className={`py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    gameMode === 'single'
                      ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Bot size={15} className={gameMode === 'single' ? 'text-cyan-400' : 'text-white/50'} />
                  <span>1 Player (vs Bot)</span>
                </button>

                <button
                  onClick={() => onModeChange?.('multi')}
                  className={`py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    gameMode === 'multi'
                      ? 'bg-pink-500/25 border-pink-400 text-white font-bold shadow-lg shadow-pink-500/20'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users size={15} className={gameMode === 'multi' ? 'text-pink-400' : 'text-white/50'} />
                  <span>2 Players (Local)</span>
                </button>
              </div>
            </div>

            {gameMode === 'single' && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/60">Bot Difficulty:</span>
                <div className="flex gap-1 font-mono text-xs">
                  {(['easy', 'normal', 'hard'] as BotDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => onDifficultyChange?.(diff)}
                      className={`px-3 py-1 rounded-lg capitalize transition-all text-xs font-semibold ${
                        (diff === 'easy' && (botDifficulty === 'easy' || botDifficulty === 'novice')) ||
                        (diff === 'normal' && (botDifficulty === 'normal' || botDifficulty === 'tactical')) ||
                        (diff === 'hard' && (botDifficulty === 'hard' || botDifficulty === 'ace'))
                          ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                          : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Big Prominent Start Button */}
          <button
            onClick={startGame}
            id="start-game-btn"
            className="group relative px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:via-cyan-300 hover:to-blue-400 text-black font-mono font-black text-sm sm:text-base tracking-wider uppercase transition-all shadow-xl shadow-cyan-500/30 flex items-center gap-3 active:scale-95 cursor-pointer"
          >
            <Play size={18} className="fill-black group-hover:scale-110 transition-transform" />
            <span>START GAME</span>
          </button>
          <div className="text-[10px] font-mono text-white/40 mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-bold">[SPACE]</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-bold">[ENTER]</kbd> to Start
          </div>

          {/* Quick Utility Row */}
          <div className="flex items-center gap-3 mt-6 font-mono text-xs">
            <button
              onClick={() => {
                const nextMuted = soundEngine.toggleMute();
                setIsMuted(nextMuted);
                onToggleMute?.();
              }}
              className={`px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                isMuted
                  ? 'bg-red-500/15 border-red-500/30 text-red-300'
                  : 'bg-white/5 border-white/15 text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-cyan-400" />}
              <span>{isMuted ? 'Sound: Muted' : 'Sound: ON'}</span>
            </button>

            <button
              onClick={handleOpenSettings}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/15 transition-all flex items-center gap-2"
            >
              <Gamepad2 size={14} className="text-pink-400" />
              <span>How to Play</span>
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN OVERLAY */}
      {waveState === 'game_over' && !isMainMenu && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 mb-3 shadow-xl flex items-center justify-center animate-pulse">
            <Skull size={32} />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wider uppercase text-red-400 mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
            GAME OVER!
          </h2>
          <p className="text-sm font-mono text-white/70 mb-5">
            Both ships were destroyed.
          </p>

          {/* Score Summary Box */}
          <div className="w-full max-w-sm bg-black/60 border border-white/10 rounded-xl p-4 mb-6 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center text-white/50">
              <span>Level Reached:</span>
              <span className="text-white font-bold">{currentSector.name} (Wave {currentWave})</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>Player 1 Score:</span>
              <span className="text-cyan-300 font-bold">{hudState.p1.score.toLocaleString()} pts</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>{gameMode === 'single' ? 'Bot' : 'Player 2'} Score:</span>
              <span className="text-pink-300 font-bold">{hudState.p2.score.toLocaleString()} pts</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-amber-400 font-bold">Total Team Score:</span>
              <span className="text-amber-300 font-black text-sm">{(hudState.p1.score + hudState.p2.score).toLocaleString()} pts</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 font-mono text-xs w-full max-w-sm">
            <button
              onClick={restartGame}
              id="game-over-restart-btn"
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={15} className="text-black" />
              <span>PLAY AGAIN</span>
              <span className="text-[10px] opacity-70">[SPACE]</span>
            </button>

            <button
              onClick={returnToMenu}
              id="game-over-menu-btn"
              className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home size={15} />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN OVERLAY */}
      {waveState === 'victory' && !isMainMenu && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-3 shadow-xl flex items-center justify-center animate-bounce">
            <Trophy size={32} />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wider uppercase text-emerald-400 mb-1 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">
            YOU WIN!
          </h2>
          <p className="text-sm font-mono text-white/80 mb-5">
            You cleared all 4 levels and saved the galaxy!
          </p>

          {/* Score Summary Box */}
          <div className="w-full max-w-sm bg-black/60 border border-white/10 rounded-xl p-4 mb-6 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center text-white/50">
              <span>Final Fleet Score:</span>
              <span className="text-amber-300 font-black text-sm">{(hudState.p1.score + hudState.p2.score).toLocaleString()} pts</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>Player 1:</span>
              <span className="text-cyan-300 font-bold">{hudState.p1.score.toLocaleString()} pts</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>{gameMode === 'single' ? 'Bot' : 'Player 2'}:</span>
              <span className="text-pink-300 font-bold">{hudState.p2.score.toLocaleString()} pts</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 font-mono text-xs w-full max-w-sm">
            <button
              onClick={restartGame}
              id="victory-restart-btn"
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-bold tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={15} className="text-black" />
              <span>PLAY AGAIN</span>
              <span className="text-[10px] opacity-70">[SPACE]</span>
            </button>

            <button
              onClick={returnToMenu}
              id="victory-menu-btn"
              className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home size={15} />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}

      {/* CLEAN ARCADE PAUSE MENU OVERLAY */}
      {isPaused && !isMainMenu && !isSettingsActive && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-pink-500/30 border border-cyan-500/40 text-cyan-300 mb-4 shadow-xl flex items-center justify-center">
            <Play size={24} className="fill-cyan-300 translate-x-0.5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-mono uppercase tracking-widest text-white mb-1">
            GAME PAUSED
          </h2>
          <p className="text-xs font-mono text-white/50 mb-6 max-w-sm">
            Take a breather! Resume whenever you are ready.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 font-mono text-xs">
            <button
              onClick={() => setIsPaused(false)}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Play size={14} className="fill-black" />
              <span>Resume Game [P]</span>
            </button>

            <button
              onClick={handleOpenSettings}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Gamepad2 size={14} />
              <span>How to Play & Settings [ESC]</span>
            </button>

            <button
              onClick={restartGame}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Restart Game</span>
            </button>

            <button
              onClick={returnToMenu}
              className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home size={14} />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. Settings & Mission Field Guide Modal Overlay */}
      <SettingsModal
        isOpen={isSettingsActive}
        onClose={handleCloseSettings}
        gameMode={gameMode}
        onModeChange={onModeChange || (() => {})}
        botDifficulty={botDifficulty}
        onDifficultyChange={onDifficultyChange || (() => {})}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = soundEngine.toggleMute();
          setIsMuted(nextMuted);
          onToggleMute?.();
        }}
        onRestartGame={restartGame}
        currentSectorId={currentSector.id}
      />

      {/* 8. End-of-Sector Combat Debrief Modal */}
      <DebriefModal
        isOpen={isDebriefOpen}
        stats={debriefStats}
        onProceed={handleProceedDebrief}
        onRestart={handleRestartDebrief}
        isFinalSector={sectorIndex >= SECTORS.length - 1}
      />
    </div>
  );
};
