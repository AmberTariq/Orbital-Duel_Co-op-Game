/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DebriefStats } from '../types';
import {
  Trophy,
  Crosshair,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Flame,
  Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebriefModalProps {
  isOpen: boolean;
  stats: DebriefStats | null;
  onProceed: () => void;
  onRestart: () => void;
  onReturnToMenu?: () => void;
  onClose?: () => void;
  isFinalSector?: boolean;
}

export function DebriefModal({
  isOpen,
  stats,
  onProceed,
  onRestart,
  onReturnToMenu,
  isFinalSector = false,
}: DebriefModalProps) {
  if (!isOpen || !stats) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const rankBadgeColor =
    stats.rank === 'S'
      ? 'from-amber-400 via-yellow-300 to-amber-500 text-black border-amber-300'
      : stats.rank === 'A'
      ? 'from-cyan-400 to-blue-500 text-white border-cyan-400'
      : 'from-emerald-400 to-teal-500 text-white border-emerald-400';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#080d1a]/95 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden font-sans"
        >
          {/* Top Header Banner */}
          <div className="relative px-8 pt-8 pb-6 border-b border-white/10 bg-gradient-to-b from-cyan-950/40 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono uppercase font-bold tracking-wider">
                    {stats.isVictory ? '🎉 GALAXY SAVED!' : stats.isBossDefeated ? 'BOSS DEFEATED!' : 'LEVEL COMPLETED!'}
                  </span>
                  <span className="text-white/40 font-mono text-[10px]">{stats.codeName}</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
                  {stats.isVictory ? 'Victory! You Cleared All Levels' : `${stats.sectorName} Cleared!`}
                </h2>
                <p className="text-xs text-white/60 font-mono mt-1">
                  Great flying! Here is your score breakdown:
                </p>
              </div>

              {/* Rank Badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${rankBadgeColor} flex items-center justify-center font-black text-3xl shadow-lg border`}
                >
                  {stats.rank}
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider mt-1 text-white/80 uppercase">
                  {stats.rankTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid Matrix */}
          <div className="p-8 space-y-6">
            {/* Primary Score Row */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-center">
                <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider flex items-center justify-center gap-1">
                  <Trophy size={12} className="text-amber-400" /> Total Team Score
                </div>
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 font-mono mt-1">
                  {stats.totalScore.toLocaleString()}
                </div>
              </div>

              <div className="text-center border-x border-white/10 px-2">
                <div className="text-[10px] text-cyan-400/80 font-mono uppercase tracking-wider">
                  Player 1
                </div>
                <div className="text-xl font-bold text-cyan-300 font-mono mt-1">
                  {stats.p1Score.toLocaleString()}
                </div>
              </div>

              <div className="text-center">
                <div className="text-[10px] text-pink-400/80 font-mono uppercase tracking-wider">
                  Player 2 / Bot
                </div>
                <div className="text-xl font-bold text-pink-300 font-mono mt-1">
                  {stats.p2Score.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-1.5">
                  <Crosshair size={12} className="text-red-400" /> Enemies Defeated
                </span>
                <span className="text-xl font-mono font-bold text-white mt-2">
                  {stats.enemiesDestroyed}
                </span>
                <span className="text-[9px] text-white/40 font-mono">Ships shot down</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-400" /> Asteroids
                </span>
                <span className="text-xl font-mono font-bold text-white mt-2">
                  {stats.asteroidsDemolished}
                </span>
                <span className="text-[9px] text-white/40 font-mono">Rocks blasted</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-1.5">
                  <Sparkles size={12} className="text-yellow-400" /> Power-Ups
                </span>
                <span className="text-xl font-mono font-bold text-white mt-2">
                  {stats.powerUpsCollected}
                </span>
                <span className="text-[9px] text-white/40 font-mono">Capsules collected</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-1.5">
                  <Clock size={12} className="text-cyan-400" /> Level Time
                </span>
                <span className="text-xl font-mono font-bold text-cyan-300 mt-2">
                  {formatTime(stats.timeElapsed)}
                </span>
                <span className="text-[9px] text-white/40 font-mono">Duration</span>
              </div>
            </div>

            {/* Boss Damage Banner */}
            {stats.bossDamage > 0 && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 flex items-center justify-between text-xs font-mono">
                <span className="text-red-300 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-red-400" /> Boss Damage Dealt:
                </span>
                <span className="font-bold text-red-200">
                  {stats.bossDamage.toLocaleString()} HP (+{stats.bonusScore} Bonus Pts)
                </span>
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="px-8 py-5 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onRestart}
                className="px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-all flex items-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Restart Game</span>
              </button>

              {onReturnToMenu && (
                <button
                  onClick={onReturnToMenu}
                  className="px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-all flex items-center gap-2"
                >
                  <Home size={14} />
                  <span>Main Menu</span>
                </button>
              )}
            </div>

            <button
              onClick={onProceed}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
            >
              <span>{isFinalSector ? 'Play Again' : 'Next Level'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
