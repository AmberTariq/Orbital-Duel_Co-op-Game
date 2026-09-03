/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, BotDifficulty } from '../types';
import { SECTORS } from '../utils/levels';
import {
  X,
  Gamepad2,
  Zap,
  Crosshair,
  Layers,
  Bot,
  Users,
  Shield,
  Bomb,
  HeartPulse,
  Flame,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Play,
  Home,
} from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  botDifficulty: BotDifficulty;
  onDifficultyChange: (diff: BotDifficulty) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestartGame: () => void;
  onReturnToMenu?: () => void;
  initialTab?: 'controls' | 'powerups' | 'dossier' | 'sectors';
  currentSectorId?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gameMode,
  onModeChange,
  botDifficulty,
  onDifficultyChange,
  isMuted,
  onToggleMute,
  onRestartGame,
  onReturnToMenu,
  initialTab = 'controls',
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'powerups' | 'dossier' | 'sectors'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Normalized difficulty display
  const currentDiffName =
    botDifficulty === 'easy' || botDifficulty === 'novice'
      ? 'Easy'
      : botDifficulty === 'hard' || botDifficulty === 'ace'
      ? 'Hard'
      : 'Normal';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-[#0a0f1d] border border-white/15 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Gamepad2 className="text-black fill-black" size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                How to Play & Settings
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  {gameMode === 'single' ? '1 Player (vs Bot)' : '2 Players (Local)'}
                </span>
              </h2>
              <p className="text-[11px] text-white/50">Game paused. Check controls, power-ups, and game options.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              title="Close and Resume (ESC)"
            >
              <Play size={13} className="fill-current" />
              <span>Resume [ESC]</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-black/50 border-b border-white/10 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap ${
              activeTab === 'controls'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={14} className={activeTab === 'controls' ? 'text-cyan-400' : 'text-white/50'} />
            <span>Controls & Modes</span>
          </button>

          <button
            onClick={() => setActiveTab('powerups')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap ${
              activeTab === 'powerups'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap size={14} className={activeTab === 'powerups' ? 'text-yellow-400' : 'text-white/50'} />
            <span>Power-Ups</span>
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap ${
              activeTab === 'dossier'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crosshair size={14} className={activeTab === 'dossier' ? 'text-red-400' : 'text-white/50'} />
            <span>Enemies</span>
          </button>

          <button
            onClick={() => setActiveTab('sectors')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap ${
              activeTab === 'sectors'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} className={activeTab === 'sectors' ? 'text-purple-400' : 'text-white/50'} />
            <span>Levels & Hazards</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: Controls & Game Modes */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Game Mode
                    </h3>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Play solo with an automated bot buddy or invite a friend on the same keyboard!
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => onModeChange('single')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                        gameMode === 'single'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                          : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                      }`}
                    >
                      <Bot size={13} className="text-cyan-400" />
                      <span>1 Player (vs Bot)</span>
                    </button>

                    <button
                      onClick={() => onModeChange('multi')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                        gameMode === 'multi'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold shadow-sm'
                          : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                      }`}
                    >
                      <Users size={13} className="text-pink-400" />
                      <span>2 Players (Local)</span>
                    </button>
                  </div>
                </div>

                {/* Bot Difficulty (if single player) */}
                {gameMode === 'single' && (
                  <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/70">Computer Bot Difficulty:</span>
                      <span className="text-xs text-pink-400 font-bold">({currentDiffName})</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {(['easy', 'normal', 'hard'] as BotDifficulty[]).map(diff => (
                        <button
                          key={diff}
                          onClick={() => onDifficultyChange(diff)}
                          className={`px-3 py-1 rounded-md capitalize transition-all font-medium ${
                            (diff === 'easy' && (botDifficulty === 'easy' || botDifficulty === 'novice')) ||
                            (diff === 'normal' && (botDifficulty === 'normal' || botDifficulty === 'tactical')) ||
                            (diff === 'hard' && (botDifficulty === 'hard' || botDifficulty === 'ace'))
                              ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40 font-bold'
                              : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Keybinding Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player 1 */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs font-bold text-cyan-400 uppercase">
                        Player 1 (Cyan Ship)
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                      KEYBOARD
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                      <span className="text-white/50">Thrust</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold border border-white/10">W</kbd>
                    </div>
                    <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                      <span className="text-white/50">Brake / Back</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold border border-white/10">S</kbd>
                    </div>
                    <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                      <span className="text-white/50">Turn</span>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-bold border border-white/10">A</kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-bold border border-white/10">D</kbd>
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-cyan-300 font-semibold">Fire Lasers</span>
                      <kbd className="px-2.5 py-0.5 rounded bg-cyan-500/40 text-white font-bold border border-cyan-400/40">SPACE</kbd>
                    </div>
                  </div>
                </div>

                {/* Player 2 or Bot */}
                <div className="p-4 rounded-xl bg-pink-950/20 border border-pink-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse" />
                      <span className="text-xs font-bold text-pink-400 uppercase">
                        {gameMode === 'single' ? 'Computer Bot (Pink Ship)' : 'Player 2 (Pink Ship)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-pink-400/80 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 font-bold">
                      {gameMode === 'single' ? `BOT: ${currentDiffName.toUpperCase()}` : 'KEYBOARD'}
                    </span>
                  </div>

                  {gameMode === 'single' ? (
                    <div className="space-y-2 text-xs text-white/70">
                      <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                        <span className="text-white/50">Role</span>
                        <span className="text-pink-300 font-semibold">Wingman Buddy</span>
                      </div>
                      <p className="text-[11px] text-white/50 pt-1 leading-relaxed">
                        The computer bot automatically flies alongside you, dodges rocks, picks up power-ups, and fires at enemies!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                        <span className="text-white/50">Thrust</span>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-pink-300 font-bold border border-white/10">UP</kbd>
                      </div>
                      <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                        <span className="text-white/50">Brake / Back</span>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-pink-300 font-bold border border-white/10">DOWN</kbd>
                      </div>
                      <div className="p-2.5 rounded bg-black/50 border border-white/5 flex items-center justify-between">
                        <span className="text-white/50">Turn</span>
                        <div className="flex gap-1">
                          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-pink-300 font-bold border border-white/10">LEFT</kbd>
                          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-pink-300 font-bold border border-white/10">RIGHT</kbd>
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-pink-500/20 border border-pink-500/30 flex items-center justify-between">
                        <span className="text-pink-300 font-semibold">Fire Lasers</span>
                        <kbd className="px-2.5 py-0.5 rounded bg-pink-500/40 text-white font-bold border border-pink-400/40">ENTER</kbd>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* General Shortcuts & Action Buttons */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6 font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px]">HELP / SETTINGS</span>
                    <span className="text-white font-bold">[ESC]</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">PAUSE GAME</span>
                    <span className="text-white font-bold">[P]</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">SOUND ON/OFF</span>
                    <span className="text-white font-bold">[M]</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">CO-OP REVIVE</span>
                    <span className="text-cyan-400 font-bold">5s respawn</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onToggleMute}
                    className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                      isMuted
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isMuted ? 'Sound: Muted' : 'Sound: ON'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onRestartGame();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Restart Game</span>
                  </button>

                  {onReturnToMenu && (
                    <button
                      onClick={() => {
                        onReturnToMenu();
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <Home size={13} />
                      <span>Main Menu</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Power-Ups */}
          {activeTab === 'powerups' && (
            <div className="space-y-4">
              <div className="text-xs text-white/60">
                Fly close to floating capsules dropped by asteroids and enemies to grab these boosts:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Rapid Fire */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Rapid Fire</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">10s</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Fires lasers twice as fast!
                    </p>
                  </div>
                </div>

                {/* Deflector Shield */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Deflector Shield</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">8s</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Blocks all incoming damage for 8 seconds.
                    </p>
                  </div>
                </div>

                {/* Spread Cannon */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Crosshair size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Spread Cannon</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">10s</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Fires 5 lasers at once in a wide fan.
                    </p>
                  </div>
                </div>

                {/* EMP Shockwave */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Bomb size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>EMP Shockwave</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Instant</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Destroys nearby asteroids and stuns enemies.
                    </p>
                  </div>
                </div>

                {/* Health Pack */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-green-500/20 hover:border-green-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
                    <HeartPulse size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Health Pack</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-green-500/20 text-green-300 font-mono">+40 HP</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Heals +40 HP immediately.
                    </p>
                  </div>
                </div>

                {/* Laser Beam */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                  <div className="p-2.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Laser Beam</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-mono">8s</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Fires a continuous laser beam for 8 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Enemies */}
          {activeTab === 'dossier' && (
            <div className="space-y-4">
              <div className="text-xs text-white/60">
                Enemy ships you will encounter during each wave:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Scout */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-red-500/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-red-400">Scout</span>
                    <span className="text-[10px] text-white/50 font-mono bg-white/5 px-2 py-0.5 rounded">
                      HP: 25 | 80 pts
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Fast, agile raider that swoops in and shoots small blaster bolts.
                  </p>
                </div>

                {/* Sniper */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-purple-500/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-400">Sniper</span>
                    <span className="text-[10px] text-white/50 font-mono bg-white/5 px-2 py-0.5 rounded">
                      HP: 70 | 200 pts
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Stays at a safe distance and fires accurate laser shots.
                  </p>
                </div>

                {/* Kamikaze */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-orange-500/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-orange-400">Kamikaze</span>
                    <span className="text-[10px] text-white/50 font-mono bg-white/5 px-2 py-0.5 rounded">
                      HP: 35 | 150 pts
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Rocket drone that charges directly at you to explode! Shoot it quickly.
                  </p>
                </div>

                {/* Gunship */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-rose-500/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-400">Gunship</span>
                    <span className="text-[10px] text-white/50 font-mono bg-white/5 px-2 py-0.5 rounded">
                      HP: 130 | 350 pts
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Heavily armored ship that fires a spread of lasers.
                  </p>
                </div>

                {/* Boss */}
                <div className="md:col-span-2 p-4 rounded-xl bg-red-950/25 border border-red-500/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Crosshair size={15} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400">Level Boss</span>
                    </div>
                    <span className="text-[10px] text-red-300 font-mono bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 font-bold">
                      HP: 1200+ | 5,000 pts
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Appears at the end of each level with big health, rotating turrets, and bullet waves!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Levels & Hazards */}
          {activeTab === 'sectors' && (
            <div className="space-y-4">
              <div className="text-xs text-white/60">
                Four action-packed levels with unique hazards and bosses:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTORS.map(sec => (
                  <div key={sec.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{sec.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono">
                        {sec.codeName}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">{sec.subtitle}</p>
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px]">
                      <div className="text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        <span>Hazard: {sec.hazardName}</span>
                      </div>
                      <div className="text-white/50">{sec.hazardDescription}</div>
                      <div className="text-red-400/90 mt-1 font-semibold">Boss: {sec.bossName} ({sec.bossTitle})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-black/50 flex justify-between items-center text-xs text-white/50 font-mono">
          <span className="text-[11px]">HOTKEYS: ESC (RESUME) · P (PAUSE) · M (SOUND)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors text-xs font-bold"
          >
            Close & Resume [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
