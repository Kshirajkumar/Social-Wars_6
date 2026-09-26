import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Coins, Zap, RotateCcw, Home, Sparkles, CheckCircle2 } from 'lucide-react';
import { PostGameSummary, RoomPlayer } from '../../types/game';
import { sounds } from '../../services/sound';
import { socket } from '../../services/socket';

interface PostGameScreenProps {
  summary: PostGameSummary;
  currentPlayerId: string;
  isHost: boolean;
  onReturnToLobby: () => void;
}

export const PostGameScreen: React.FC<PostGameScreenProps> = ({
  summary,
  currentPlayerId,
  isHost,
  onReturnToLobby,
}) => {
  const me = summary.playersSummary.find((p) => p.playerId === currentPlayerId) || summary.playersSummary[0];
  const isWinner = summary.winnerIds.includes(currentPlayerId);

  useEffect(() => {
    if (isWinner) {
      sounds.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      sounds.playSuspense();
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none ${
            isWinner ? 'bg-amber-500' : 'bg-purple-600'
          }`}
        />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            MATCH RESOLUTION
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            {isWinner ? '👑 VICTORY!' : '🏆 MATCH COMPLETE'}
          </h1>
          <p className="text-sm text-slate-400">
            Winner: <span className="text-amber-400 font-bold">{summary.winnerNames.join(', ')}</span>
          </p>
        </div>

        {/* My Match Performance Card */}
        {me && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{me.avatar}</span>
                <div>
                  <h3 className="font-extrabold text-base text-white">{me.playerName}</h3>
                  <span className="text-xs text-amber-400 font-medium">
                    {isWinner ? 'Match Champion' : 'Match Finalist'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium block">Match Score</span>
                <span className="font-mono text-2xl font-black text-amber-400">
                  {me.score.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Currency & XP Grants */}
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-300">Coins</span>
                </div>
                <span className="text-sm font-bold text-amber-400">+{me.coinsEarned}</span>
              </div>

              <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-slate-300">XP</span>
                </div>
                <span className="text-sm font-bold text-purple-400">+{me.xpEarned}</span>
              </div>
            </div>

            {/* Performance Radar Metrics */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Performance Evaluation
              </span>

              <div className="space-y-1.5 text-xs">
                {[
                  { label: '🎯 Accuracy', val: me.performance.accuracy },
                  { label: '🧠 Decisions', val: me.performance.decisions },
                  { label: '💰 Economy', val: me.performance.economy },
                  { label: '🎭 Deception', val: me.performance.deception },
                  { label: '🔎 Investigation', val: me.performance.investigation },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>{stat.label}</span>
                      <span className="font-mono font-bold">{stat.val}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-amber-400 h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${stat.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Unlocked notification */}
            {me.unlockedAchievements.length > 0 && (
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg">
                  ✨
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                    Achievement Unlocked
                  </span>
                  <p className="text-xs font-bold text-slate-100">
                    {me.unlockedAchievements[0].replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Table of Match */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Room Standings
          </span>
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
            {summary.playersSummary
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, idx) => (
                <div
                  key={p.playerId}
                  className={`p-3 flex items-center justify-between text-xs ${
                    p.playerId === currentPlayerId ? 'bg-purple-950/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-500 w-4">#{idx + 1}</span>
                    <span className="text-lg">{p.avatar}</span>
                    <span className="font-bold text-slate-200">{p.playerName}</span>
                    {summary.winnerIds.includes(p.playerId) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        Winner
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-amber-400">{p.score} pts</span>
                </div>
              ))}
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {isHost ? (
            <>
              <button
                onClick={() => {
                  sounds.playClick();
                  socket.rematch();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  onReturnToLobby();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Home className="w-4 h-4" /> CHANGE GAME / LOBBY
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onReturnToLobby();
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <Home className="w-4 h-4" /> RETURN TO LOBBY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
