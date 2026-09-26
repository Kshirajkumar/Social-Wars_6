import React, { useState } from 'react';
import { X, HelpCircle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { GameType } from '../../types/game';
import { sounds } from '../../services/sound';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGame?: GameType;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({
  isOpen,
  onClose,
  defaultGame = 'BLUFF_CITY',
}) => {
  const [selectedGame, setSelectedGame] = useState<GameType>(defaultGame);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border-b border-cyan-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Game Field Manual</h3>
              <p className="text-xs text-cyan-300">Learn the rules in 60 seconds</p>
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

        {/* Game Switcher Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex items-center gap-2 text-xs overflow-x-auto">
          {[
            { id: 'BLUFF_CITY', label: '🕵️ Bluff City' },
            { id: 'MURDER_MYSTERY', label: '🔪 Murder Mystery' },
            { id: 'SECRET_AUCTION', label: '🃏 Secret Auction' },
            { id: 'DRAW_AND_GUESS', label: '🎨 Live Draw & Guess' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setSelectedGame(tab.id as GameType);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                selectedGame === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rules Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {selectedGame === 'BLUFF_CITY' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  The Core Premise
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  "Who can I trust in Bluff City?"
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Five power players enter the city. Each receives a secret role (Detective, Criminal, Journalist, Politician, Informant) and an individual secret objective.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  How to Play (3 Simple Phases):
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Action Phase:</strong> Visit City locations (Bank, City Hall, News Agency, Black Market) to launder coins, pass laws, or leak intel.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Discussion & Pacts:</strong> Lie, make public pacts, and deceive others. Watch the City Stability meter — if stability crashes, crime spikes!
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Council Voting:</strong> Vote on emergency decrees and unmask the syndicate criminal before they siphon the treasury.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedGame === 'MURDER_MYSTERY' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                  The Case Dossier
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  "The Last Night at Blackwood Manor"
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Lord Blackwood was murdered in his estate at 23:42. One of the players in this room is secretly the killer. Everyone else is an investigator, but every guest has a shameful dark secret to hide!
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Investigation Protocol:
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Exploration:</strong> Move across 9 mansion rooms (Library, Lab, Vault, Security) and search for physical, digital, and documentary clues.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Interrogation & Accusation:</strong> Compare timelines and alibis. Accuse the killer with supporting evidence and confidence percentage!
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded">
                      3
                    </span>
                    <div>
                      <strong className="text-white">90s Escape Phase:</strong> If the murderer survives, they attempt a mad dash through secret doors to the Garden exit. Investigators must trigger lockdowns to block them!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedGame === 'SECRET_AUCTION' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  High-Stakes Economics
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  "Do I know something the others don't?"
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Start with 100,000 capital. Bid on luxury hotels, tech startups, and freight fleets. Each asset has an estimated range, but only research reveals its true hidden value.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Market Rules:
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Anti-Snipe Overtime:</strong> Bidding during the final 5 seconds automatically adds +5 seconds to prevent last-millisecond cheese.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Market Shocks:</strong> Unforeseen market events (AI boom, interest rate hikes, luxury tax) swing asset valuations wildly after each round.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Debt & Due Diligence:</strong> Leverage bank loans or pay for private research. The player with the highest final net worth wins!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedGame === 'DRAW_AND_GUESS' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Live Drawing & Fast Guessing
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  "Draw fast, guess faster!"
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  A random player is chosen as the Artist each round to draw a secret word live on canvas. All other players see masked letter hints and type guesses in Chat!
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Match Rules (10 Rounds):
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Live Canvas Drawing:</strong> The Artist uses colors, brush sizes, and erasers to draw the secret word on a big live board.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Top 3 Guesser Points:</strong> 1st correct guesser gets <strong>+1,000 Pts</strong>, 2nd gets <strong>+700 Pts</strong>, 3rd gets <strong>+500 Pts</strong>!
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Artist Rewards:</strong> The Artist earns +300 Pts for every player who successfully guesses their drawing.
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                    <span className="font-mono font-bold text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded">
                      4
                    </span>
                    <div>
                      <strong className="text-white">Dynamic 1 to 7 Minute Timers:</strong> Drawing timers dynamically adjust from 60 seconds (Beginner) up to 420 seconds (7 minutes on Master levels for complex phrases and masterpieces).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
