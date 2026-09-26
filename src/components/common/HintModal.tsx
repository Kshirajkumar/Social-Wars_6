import React, { useState } from 'react';
import { Lightbulb, Coins, AlertTriangle, X, Check, ArrowRight } from 'lucide-react';
import { HINT_TIERS, HintTier } from '../../types/game';
import { sounds } from '../../services/sound';
import { socket } from '../../services/socket';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  currentHintText?: string;
  gameTitle: string;
}

export const HintModal: React.FC<HintModalProps> = ({
  isOpen,
  onClose,
  walletBalance,
  currentHintText,
  gameTitle,
}) => {
  const [selectedTier, setSelectedTier] = useState<HintTier | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSelectTier = (tier: HintTier) => {
    sounds.playClick();
    setSelectedTier(tier);
    setShowConfirm(true);
  };

  const handleConfirmUse = () => {
    if (!selectedTier) return;
    sounds.playClick();
    socket.useHint(selectedTier.tier);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    sounds.playClick();
    setShowConfirm(false);
    setSelectedTier(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-amber-500/20 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Tactical Hint System</h3>
              <p className="text-xs text-amber-400/80 font-medium">{gameTitle}</p>
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

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Active Hint Revealed Banner */}
          {currentHintText && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 animate-in zoom-in-95">
              <div className="flex items-center gap-2 font-semibold text-xs text-amber-400 uppercase tracking-wider mb-1">
                <Lightbulb className="w-4 h-4" /> Active Clue Intel
              </div>
              <p className="text-sm font-medium leading-relaxed">{currentHintText}</p>
            </div>
          )}

          {/* Confirmation Dialog Overlay */}
          {showConfirm && selectedTier ? (
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="font-black text-lg text-slate-100 uppercase tracking-wide">
                  USE HINT?
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedTier.name} — {selectedTier.description}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cost:</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> {selectedTier.cost.toLocaleString()} Coins
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Score Penalty:</span>
                  <span className="text-rose-400 font-bold">
                    -{selectedTier.scorePenalty.toLocaleString()} Pts
                  </span>
                </div>
              </div>

              {walletBalance < selectedTier.cost && (
                <p className="text-xs text-rose-400 font-semibold text-center">
                  ⚠️ Insufficient Social Coins in your virtual wallet!
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                >
                  CANCEL
                </button>
                <button
                  disabled={walletBalance < selectedTier.cost}
                  onClick={handleConfirmUse}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  USE HINT
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Choose a hint tier. Higher tiers provide direct deductions but cost more coins and reduce match score.
              </p>

              {HINT_TIERS.map((tier) => {
                const canAfford = walletBalance >= tier.cost;
                return (
                  <button
                    key={tier.tier}
                    onClick={() => handleSelectTier(tier)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-500/40 transition group flex items-center justify-between gap-3 active:scale-[0.99]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Tier {tier.tier}
                        </span>
                        <span className="font-bold text-sm text-slate-200 group-hover:text-amber-400 transition">
                          {tier.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{tier.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 justify-end">
                        <Coins className="w-3 h-3" />
                        {tier.cost}
                      </div>
                      <div className="text-[11px] font-mono text-rose-400">
                        -{tier.scorePenalty} pts
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
