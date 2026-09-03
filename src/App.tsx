/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameCanvas } from './components/GameCanvas';
import { soundEngine } from './utils/audio';
import { GameMode, BotDifficulty } from './types';
import { Ship, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('normal');
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0, total: 0 });

  useEffect(() => {
    return soundEngine.subscribeMute(muted => {
      setIsMuted(muted);
    });
  }, []);

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleModeChange = (mode: GameMode) => {
    soundEngine.init();
    setGameMode(mode);
  };

  const handleDifficultyChange = (diff: BotDifficulty) => {
    soundEngine.init();
    setBotDifficulty(diff);
  };

  const handleScoreUpdate = (p1: number, p2: number, total: number) => {
    setScores({ p1, p2, total });
  };

  return (
    <div
      onClick={() => soundEngine.init()}
      className="min-h-screen bg-[#04060c] text-white font-sans selection:bg-cyan-500/30 flex flex-col justify-between"
    >
      {/* Background Star Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-cyan-900/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-pink-900/15 rounded-full blur-[140px]" />
      </div>

      {/* Clean Top Bar: Title, Mode Tag, Scores, Audio Toggle & Settings */}
      <header className="relative border-b border-white/10 px-4 sm:px-8 py-3 flex justify-between items-center gap-4 backdrop-blur-md bg-black/60 z-20">
        {/* Left: Brand & Mode Tag */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center rounded-lg shadow-lg shadow-cyan-500/20">
            <Ship className="text-black fill-black" size={18} />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase font-mono">
              Orbital Duel
            </h1>
            <span
              onClick={() => setIsSettingsOpen(true)}
              className="cursor-pointer text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold tracking-wider transition-all"
              title="Click to view How to Play & Settings"
            >
              {gameMode === 'single' ? '1 PLAYER (VS BOT)' : '2 PLAYERS (LOCAL)'}
            </span>
          </div>
        </div>

        {/* Center: Live Score Counters */}
        <div className="flex items-center gap-3 sm:gap-6 font-mono">
          <div className="flex items-center gap-2 bg-white/[0.04] px-2.5 sm:px-3 py-1 rounded-lg border border-cyan-500/30">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">P1</span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">{scores.p1}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">TOTAL</span>
            <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-tight">{scores.total}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] px-2.5 sm:px-3 py-1 rounded-lg border border-pink-500/30">
            <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
              {gameMode === 'single' ? 'BOT' : 'P2'}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">{scores.p2}</span>
          </div>
        </div>

        {/* Right: Quick Audio & How to Play Actions */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          {/* Audio Toggle Button */}
          <button
            onClick={handleToggleMute}
            id="audio-toggle-btn"
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              isMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                : 'bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Sound [M]"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX size={17} className="text-red-400" /> : <Volume2 size={17} className="text-cyan-400" />}
          </button>

          {/* Settings & How to Play Button */}
          <button
            onClick={() => setIsSettingsOpen(prev => !prev)}
            id="settings-modal-btn"
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-mono font-medium ${
              isSettingsOpen
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="How to Play & Settings [ESC]"
            aria-label="How to Play & Settings"
          >
            <Settings size={15} className={`transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-cyan-400' : 'text-white/70'}`} />
            <span className="hidden sm:inline">How to Play</span>
            <span className="text-[10px] text-white/40 hidden md:inline">[ESC]</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Arcade Canvas Viewport (16:9 Aspect Ratio Centered) */}
      <main className="relative z-10 w-full max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center flex-1">
        <GameCanvas
          gameMode={gameMode}
          botDifficulty={botDifficulty}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onModeChange={handleModeChange}
          onDifficultyChange={handleDifficultyChange}
          isSettingsOpen={isSettingsOpen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCloseSettings={() => setIsSettingsOpen(false)}
          onScoreUpdate={handleScoreUpdate}
        />
      </main>

      {/* Compact Arcade Status Footer */}
      <footer className="border-t border-white/10 py-2.5 px-6 bg-black/60 backdrop-blur-sm flex flex-wrap justify-between items-center text-white/40 font-mono text-[10px]">
        <div className="flex items-center gap-3">
          <span>ORBITAL DUEL · RETRO ARCADE ACTION</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">CO-OP SPACE SHOOTER</span>
        </div>
        <div className="flex items-center gap-3">
          <span>PRESS <span className="text-white/70 font-semibold">[ESC]</span> HOW TO PLAY</span>
          <span className="text-white/20">|</span>
          <span><span className="text-white/70 font-semibold">[P]</span> PAUSE</span>
          <span className="text-white/20">|</span>
          <span><span className="text-white/70 font-semibold">[M]</span> SOUND</span>
        </div>
      </footer>
    </div>
  );
}
