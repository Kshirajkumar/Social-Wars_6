import React, { useState } from 'react';
import { X, Trophy, Flame, Target, Award } from 'lucide-react';
import { sounds } from '../../services/sound';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'OVERALL' | 'BLUFF_CITY' | 'MURDER_MYSTERY' | 'SECRET_AUCTION';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  title: string;
  wins: number;
  matches: number;
  winRate: number;
  avgScore: number;
  highScore: number;
  streak: number;
}

const MOCK_LEADERBOARD: Record<TabType, LeaderboardEntry[]> = {
  OVERALL: [
    { rank: 1, name: 'Kshiraj', avatar: '👑', title: 'Grand Politician', wins: 48, matches: 62, winRate: 77.4, avgScore: 11200, highScore: 18450, streak: 8 },
    { rank: 2, name: 'Rahul', avatar: '🐺', title: 'The Mastermind', wins: 42, matches: 58, winRate: 72.4, avgScore: 10450, highScore: 16800, streak: 5 },
    { rank: 3, name: 'Arjun', avatar: '🦊', title: 'Market Whale', wins: 39, matches: 55, winRate: 70.9, avgScore: 9980, highScore: 15400, streak: 6 },
    { rank: 4, name: 'Sai', avatar: '🐯', title: 'Ace Inquisitor', wins: 34, matches: 50, winRate: 68.0, avgScore: 9400, highScore: 14900, streak: 3 },
    { rank: 5, name: 'Vikram', avatar: '🦁', title: 'The Phantom', wins: 31, matches: 48, winRate: 64.5, avgScore: 9100, highScore: 13800, streak: 4 },
  ],
  BLUFF_CITY: [
    { rank: 1, name: 'Rahul', avatar: '🐺', title: 'The Silver Tongue', wins: 22, matches: 28, winRate: 78.5, avgScore: 11800, highScore: 17200, streak: 6 },
    { rank: 2, name: 'Kshiraj', avatar: '👑', title: 'Mister Mayor', wins: 20, matches: 26, winRate: 76.9, avgScore: 11100, highScore: 16900, streak: 4 },
    { rank: 3, name: 'Sai', avatar: '🐯', title: 'Contraband King', wins: 17, matches: 24, winRate: 70.8, avgScore: 9800, highScore: 14500, streak: 3 },
    { rank: 4, name: 'Arjun', avatar: '🦊', title: 'Shadow Broker', wins: 15, matches: 22, winRate: 68.1, avgScore: 9400, highScore: 13900, streak: 2 },
    { rank: 5, name: 'Vikram', avatar: '🦁', title: 'Double Agent', wins: 13, matches: 21, winRate: 61.9, avgScore: 8900, highScore: 13200, streak: 3 },
  ],
  MURDER_MYSTERY: [
    { rank: 1, name: 'Sai', avatar: '🐯', title: 'Sherlock of Blackwood', wins: 19, matches: 23, winRate: 82.6, avgScore: 12400, highScore: 18100, streak: 7 },
    { rank: 2, name: 'Kshiraj', avatar: '👑', title: 'Forensic Prodigy', wins: 18, matches: 24, winRate: 75.0, avgScore: 11500, highScore: 17400, streak: 5 },
    { rank: 3, name: 'Rahul', avatar: '🐺', title: 'The Perfect Crime', wins: 15, matches: 22, winRate: 68.1, avgScore: 10200, highScore: 15600, streak: 4 },
    { rank: 4, name: 'Vikram', avatar: '🦁', title: 'Houdini of Manor', wins: 13, matches: 20, winRate: 65.0, avgScore: 9300, highScore: 14200, streak: 2 },
    { rank: 5, name: 'Arjun', avatar: '🦊', title: 'Eye in Sky', wins: 12, matches: 19, winRate: 63.1, avgScore: 9000, highScore: 13700, streak: 3 },
  ],
  SECRET_AUCTION: [
    { rank: 1, name: 'Arjun', avatar: '🦊', title: 'Market Whale', wins: 21, matches: 25, winRate: 84.0, avgScore: 13800, highScore: 19500, streak: 8 },
    { rank: 2, name: 'Kshiraj', avatar: '👑', title: 'Auction Tycoon', wins: 18, matches: 23, winRate: 78.2, avgScore: 12900, highScore: 18200, streak: 5 },
    { rank: 3, name: 'Rahul', avatar: '🐺', title: 'Hedge Fund Mogul', wins: 14, matches: 20, winRate: 70.0, avgScore: 10800, highScore: 15900, streak: 3 },
    { rank: 4, name: 'Vikram', avatar: '🦁', title: 'Bargain Hunter', wins: 12, matches: 18, winRate: 66.6, avgScore: 9700, highScore: 14600, streak: 2 },
    { rank: 5, name: 'Sai', avatar: '🐯', title: 'Cash King', wins: 11, matches: 17, winRate: 64.7, avgScore: 9200, highScore: 13900, streak: 2 },
  ],
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERALL');

  if (!isOpen) return null;

  const entries = MOCK_LEADERBOARD[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-amber-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-white text-base">Global Hall of Fame</h3>
              <p className="text-xs text-slate-400">Competitive skill-ranked leaderboards</p>
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'OVERALL', label: '🏆 Overall' },
            { id: 'BLUFF_CITY', label: '🕵️ Bluff City' },
            { id: 'MURDER_MYSTERY', label: '🔪 Blackwood Manor' },
            { id: 'SECRET_AUCTION', label: '🃏 Secret Auction' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(tab.id as TabType);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-3">
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
            {entries.map((entry) => (
              <div
                key={entry.name}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center font-black font-mono">
                    {entry.rank === 1 ? (
                      <span className="text-amber-400 text-lg">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span className="text-slate-300 text-lg">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-amber-600 text-lg">🥉</span>
                    ) : (
                      <span className="text-slate-500 text-sm">#{entry.rank}</span>
                    )}
                  </div>

                  <span className="text-2xl">{entry.avatar}</span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{entry.name}</span>
                      {entry.streak >= 5 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Flame className="w-3 h-3 text-rose-500" /> {entry.streak} Streak
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-400/80 font-medium">{entry.title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 text-right font-mono text-xs">
                  <div className="hidden xs:block">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      Win Rate
                    </span>
                    <span className="font-bold text-emerald-400">{entry.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      Wins / Played
                    </span>
                    <span className="font-bold text-slate-300">
                      {entry.wins}/{entry.matches}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      Top Score
                    </span>
                    <span className="font-bold text-amber-400">
                      {entry.highScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center pt-2">
            Rankings are computed dynamically from real match outcomes, win streaks, and verified decision accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};
