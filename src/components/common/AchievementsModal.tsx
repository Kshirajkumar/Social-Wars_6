import React, { useState } from 'react';
import { X, Award, CheckCircle2, Lock, Coins, Zap } from 'lucide-react';
import { ACHIEVEMENTS, AchievementDef } from '../../data/constants';
import { sounds } from '../../services/sound';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedIds?: string[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  unlockedIds = ['first_blood', 'hound_of_law', 'due_diligence'],
}) => {
  const [filterGame, setFilterGame] = useState<string>('ALL');

  if (!isOpen) return null;

  const filtered = ACHIEVEMENTS.filter((a) => filterGame === 'ALL' || a.game === filterGame);
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border-b border-purple-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
              🏆
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Achievements Master List</h3>
              <p className="text-xs text-purple-300">
                Unlocked {unlockedCount} / {ACHIEVEMENTS.length} Medals
              </p>
            </div>
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

        {/* Filter Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Medals (50)' },
            { id: 'BLUFF_CITY', label: '🕵️ Bluff City' },
            { id: 'MURDER_MYSTERY', label: '🔪 Blackwood Manor' },
            { id: 'SECRET_AUCTION', label: '🃏 Secret Auction' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                sounds.playClick();
                setFilterGame(f.id);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterGame === f.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid List */}
        <div className="p-6 overflow-y-auto max-h-[65vh] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item) => {
            const isUnlocked = unlockedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                  isUnlocked
                    ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-70'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    isUnlocked ? 'bg-purple-500/20' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isUnlocked ? item.icon : '🔒'}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold ${
                        isUnlocked ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {item.title}
                    </h4>
                    {isUnlocked && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">{item.description}</p>

                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Coins className="w-3 h-3" /> +{item.rewardCoins}
                    </span>
                    <span className="flex items-center gap-1 text-purple-400 font-semibold">
                      <Zap className="w-3 h-3" /> +{item.rewardXp} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
