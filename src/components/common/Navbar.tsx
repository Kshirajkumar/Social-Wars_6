import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Award,
  ShoppingBag,
  HelpCircle,
  Copy,
  Check,
  Coins,
  User,
  ShieldAlert,
} from 'lucide-react';
import { sounds } from '../../services/sound';
import { socket } from '../../services/socket';
import { RoomState } from '../../types/game';

interface NavbarProps {
  room: RoomState | null;
  walletBalance: number;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenCosmetics: () => void;
  onOpenRules: () => void;
  onOpenShare?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  walletBalance,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenCosmetics,
  onOpenRules,
  onOpenShare,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());

  const handleCopyCode = () => {
    if (!room?.roomCode) return;
    if (onOpenShare) {
      onOpenShare();
      return;
    }
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playClick();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-lg font-black text-white">
            ⚔️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 text-sm sm:text-base">
                SOCIAL WARS
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-widest uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                5P Real-Time
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden xs:block font-medium">
              Trust Nobody. Read Everyone. Play Smart.
            </p>
          </div>
        </div>

        {/* Room Code Pill if in room */}
        {room && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code or Invite"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all shadow-sm active:scale-95"
            >
              <span className="text-slate-400 text-[11px] font-sans font-medium">ROOM:</span>
              <span className="font-black text-amber-400 tracking-wider">{room.roomCode}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              )}
            </button>

            {onOpenShare && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenShare();
                }}
                className="hidden xs:flex items-center gap-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
                title="QR Code & Invite Link for other phones"
              >
                <span>📱</span> Invite
              </button>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Virtual Wallet */}
          <button
            onClick={onOpenCosmetics}
            className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
            title="Social Coins Wallet & Store"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-xs">{walletBalance.toLocaleString()}</span>
          </button>

          {/* Quick Nav Icons */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenRules();
            }}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLeaderboard();
            }}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg transition"
            title="Leaderboards"
          >
            <Trophy className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAchievements();
            }}
            className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800/80 rounded-lg transition"
            title="Achievements"
          >
            <Award className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenCosmetics();
            }}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-lg transition"
            title="Cosmetics Shop"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Profile Modal */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenProfile();
            }}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition active:scale-95"
            title="My Profile & Stats"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
