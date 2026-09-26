import React from 'react';
import { X, User, Zap, Trophy, ShieldCheck, History, Award, Coins } from 'lucide-react';
import { sounds } from '../../services/sound';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  avatar: string;
  title: string;
  badgeFrame?: string;
  walletBalance: number;
  xp: number;
  level: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  playerName,
  avatar,
  title,
  badgeFrame,
  walletBalance,
  xp,
  level,
}) => {
  if (!isOpen) return null;

  const currentLevelXp = xp % 1000;
  const xpNeeded = 1000;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / xpNeeded) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border-b border-purple-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-purple-400" />
            <h3 className="font-extrabold text-white text-base">Player Dossier</h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Identity Header */}
          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <div
              className={`w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-4xl shadow-inner border-2 ${
                badgeFrame || 'border-slate-700'
              }`}
            >
              {avatar}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-lg text-white tracking-tight">{playerName}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  LVL {level}
                </span>
              </div>
              <p className="text-xs text-amber-400 font-semibold">{title}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Authoritative Identity Verified
              </div>
            </div>
          </div>

          {/* Progression Bar */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" /> Season XP Progression
              </span>
              <span className="font-mono text-purple-300 font-bold">
                {currentLevelXp} / {xpNeeded} XP
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Coins className="w-4 h-4 text-amber-400" /> Virtual Wallet
              </div>
              <span className="font-mono text-lg font-black text-amber-400">
                {walletBalance.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">🪙 Social Coins</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Trophy className="w-4 h-4 text-purple-400" /> Career Win Rate
              </div>
              <span className="font-mono text-lg font-black text-purple-300">68.4%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Top 5% Strategist</p>
            </div>
          </div>

          {/* Career Records */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Platform Medals
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl space-y-1">
                <span className="text-xl">🕵️</span>
                <p className="font-bold text-slate-200 text-[11px]">Bluff City</p>
                <span className="font-mono text-slate-400 text-[10px]">Tier 3 Master</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl space-y-1">
                <span className="text-xl">🔪</span>
                <p className="font-bold text-slate-200 text-[11px]">Blackwood</p>
                <span className="font-mono text-slate-400 text-[10px]">Ace Inquisitor</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl space-y-1">
                <span className="text-xl">🃏</span>
                <p className="font-bold text-slate-200 text-[11px]">Auction</p>
                <span className="font-mono text-slate-400 text-[10px]">Market Whale</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
