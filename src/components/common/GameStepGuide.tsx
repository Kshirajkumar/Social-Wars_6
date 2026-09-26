import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Shield,
  Search,
  Gavel,
  Target,
  Trophy,
} from 'lucide-react';
import { GameType } from '../../types/game';
import { sounds } from '../../services/sound';

interface GameStepGuideProps {
  gameType: GameType;
  phase: string;
  role?: string;
  myLocationOrRoom?: string;
}

export const GameStepGuide: React.FC<GameStepGuideProps> = ({
  gameType,
  phase,
  role,
  myLocationOrRoom,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Content configuration for each game & phase
  const getGuideContent = () => {
    if (gameType === 'BLUFF_CITY') {
      const isCriminal = role === 'CRIMINAL';
      const isDetective = role === 'DETECTIVE';

      return {
        title: '🕵️ BLUFF CITY — HOW TO PLAY & WIN',
        winGoal: isCriminal
          ? '🎯 YOUR WIN GOAL: Drain the city treasury or keep your Criminal identity unmasked until Round 5!'
          : isDetective
          ? '🎯 YOUR WIN GOAL: Unmask the Criminal using location clues and vote YES on emergency decrees!'
          : '🎯 YOUR WIN GOAL: Fulfill your secret objective and earn the highest Reputation score by Round 5!',
        step1:
          phase === 'ACTION'
            ? '👉 STEP 1: Click any City District (Bank, City Hall, Black Market, etc.) to visit it and run district maneuvers.'
            : phase === 'DISCUSSION'
            ? '👉 STEP 1: Open Room Chat or type a Public Pact below to negotiate alliances or pass bluffs.'
            : '👉 STEP 2: Vote YES or NO on the Council Decree and select a suspect to accuse.',
        step2:
          phase === 'ACTION'
            ? '👉 STEP 2: Watch who visits the Black Market or Bank—they might be launderers or syndicate operatives!'
            : phase === 'DISCUSSION'
            ? '👉 STEP 2: Check if anyone lied about where they were during the Action phase.'
            : '👉 STEP 3: Submit formal accusations to unmask the criminal and earn +2,500 bonus points!',
        details: [
          '• Action Phase (60s): Move between 6 districts. High risk areas (Black Market) give extra coins but drop City Stability.',
          '• Discussion Phase (45s): Form public pacts or whisper secretly in chat.',
          '• Voting Phase (30s): Pass decrees to boost stability. Accuse correctly to win big score multipliers.',
        ],
      };
    }

    if (gameType === 'MURDER_MYSTERY') {
      const isMurderer = role === 'MURDERER';

      return {
        title: '🔪 BLACKWOOD MANOR — HOW TO PLAY & WIN',
        winGoal: isMurderer
          ? '🎯 YOUR WIN GOAL: Destroy evidence, confuse investigators, and escape to the Garden gate in the 90s Escape phase!'
          : '🎯 YOUR WIN GOAL: Collect physical clues across 9 rooms, deduce the killer, and submit an accurate accusation!',
        step1:
          phase === 'EXPLORATION'
            ? '👉 STEP 1: Click "Walk to [Room Name]" on any room, then click "Search Room for Clues" to find evidence.'
            : phase === 'INTERROGATION'
            ? '👉 STEP 1: Open your Evidence Locker tab and compare found clues with other players in Chat.'
            : phase === 'ACCUSATION'
            ? '👉 STEP 2: Go to the "Formal Accusation" tab, select your suspect, key evidence, and submit!'
            : '👉 ESCAPE PHASE: If you are the Killer, run to the Garden! If Investigator, trigger room lockdowns!',
        step2:
          phase === 'EXPLORATION'
            ? '👉 STEP 2: Check evidence descriptions in your Evidence Locker tab to trace who was at the crime scene.'
            : phase === 'INTERROGATION'
            ? '👉 STEP 2: Look for contradictions between players\' stated alibis and found fingerprints or keycards.'
            : phase === 'ACCUSATION'
            ? '👉 STEP 3: High confidence ratings earn higher XP and leaderboard ranks if correct.'
            : '👉 STEP 3: Coordinate with team members in real-time chat.',
        details: [
          '• Exploration: Move through 9 rooms (Library, Lab, Security, etc.) to discover hidden clues.',
          '• Interrogation: Cross-reference crime scene timeline (23:42) with guest secrets and alibis.',
          '• Accusation: Select Primary Suspect + Supporting Evidence.',
          '• 90s Escape Phase: Triggered if killer survives. Block or reach the Garden exit!',
        ],
      };
    }

    // Secret Auction
    return {
      title: '🃏 SECRET AUCTION — HOW TO PLAY & WIN',
      winGoal:
        '🎯 YOUR WIN GOAL: Acquire valuable assets (Hotels, Startups, Fleets) below true value to finish with the highest Net Worth!',
      step1:
        phase === 'BIDDING'
          ? '👉 STEP 1: Click "Buy Research (5,000c)" on the current lot to reveal its TRUE secret valuation!'
          : phase === 'MARKET_EVENT'
          ? '👉 STEP 1: Read the Global Market Report to see which sector values surged or crashed.'
          : '👉 STEP 1: Check your Portfolio tab to review acquired holdings and income per round.',
      step2:
        phase === 'BIDDING'
          ? '👉 STEP 2: Enter a bid higher than the standing high bid and click "CONFIRM BID" before timer expires.'
          : phase === 'MARKET_EVENT'
          ? '👉 STEP 2: Visit the Credit & Debt tab to borrow funds or repay bank loans before the next lot starts.'
          : '👉 STEP 2: Manage liquidity so you can outbid rivals on the next high-income lot.',
      details: [
        '• Research: Assets show estimated ranges, but only Research reveals exact true valuation.',
        '• Anti-Snipe Overtime: Bidding in final 5 seconds extends timer by +5 seconds.',
        '• Market Shocks: Global events swing asset prices up or down by 20%–50%.',
        '• Credit & Debt: Borrow up to 50,000 coins at 8% interest per round.',
      ],
    };
  };

  const content = getGuideContent();

  return (
    <div className="w-full space-y-2">
      {/* Top Interactive Guidance Banner */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 tracking-wider">
                STEP-BY-STEP PLAYER GUIDE
              </span>
              <h4 className="font-extrabold text-xs text-white flex items-center gap-2">
                {content.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setIsExpanded(!isExpanded);
              }}
              className="text-xs text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition font-bold"
            >
              {isExpanded ? 'Hide Steps ▲' : 'Show Steps ▼'}
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setIsOpen(true);
              }}
              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-1 rounded-lg shadow transition flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Full Field Manual
            </button>
          </div>
        </div>

        {/* Expanded Steps Card */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-200">
            <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-amber-300">
              {content.winGoal}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-xl text-slate-200 font-medium">
                {content.step1}
              </div>
              <div className="bg-purple-950/30 border border-purple-500/20 p-2.5 rounded-xl text-slate-200 font-medium">
                {content.step2}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Rules & Instructions Field Manual Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border-b border-cyan-500/30 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Game Field Manual</h3>
                  <p className="text-xs text-cyan-300">Complete Guide: How to Play & Win</p>
                </div>
              </div>
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
              <div className="bg-slate-950 border border-cyan-500/30 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Win Condition
                </span>
                <p className="text-sm font-extrabold text-white">{content.winGoal}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Step-By-Step Mechanics:
                </h4>
                <div className="space-y-2">
                  {content.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl text-slate-200 leading-relaxed font-medium"
                    >
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
