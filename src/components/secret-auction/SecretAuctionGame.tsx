import React, { useState, useEffect } from 'react';
import {
  Gavel,
  TrendingUp,
  TrendingDown,
  Building,
  Coins,
  ShieldAlert,
  Search,
  CheckCircle,
  Clock,
  Lightbulb,
  Sparkles,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import { SecretAuctionGameState, RoomPlayer, AuctionAsset } from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';
import { GameStepGuide } from '../common/GameStepGuide';

interface SecretAuctionGameProps {
  gameState: SecretAuctionGameState;
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  isHost: boolean;
  onOpenHintModal: () => void;
}

export const SecretAuctionGame: React.FC<SecretAuctionGameProps> = ({
  gameState,
  players,
  currentPlayerId,
  isHost,
  onOpenHintModal,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [bidIncrement, setBidIncrement] = useState(5000);
  const [activeTab, setActiveTab] = useState<'LOT' | 'PORTFOLIO' | 'MARKET' | 'BANK'>('LOT');

  const myState = gameState.playerStates[currentPlayerId];
  const currentLot = gameState.currentLot;

  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((gameState.serverEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0) {
        sounds.playTick();
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [gameState.serverEndTime]);

  const handlePlaceBid = (customAmount?: number) => {
    if (!currentLot || !myState) return;
    const currentHigh = gameState.currentHighBid?.amount || currentLot.estimatedMin;
    const amount = customAmount || currentHigh + bidIncrement;

    if (myState.cash < amount) {
      sounds.playBuzzer();
      return;
    }

    sounds.playGavel();
    socket.sendGameAction('SECRET_AUCTION', 'PLACE_BID', { amount });
  };

  const handleResearch = (assetId: string) => {
    sounds.playClueFound();
    socket.sendGameAction('SECRET_AUCTION', 'RESEARCH_ASSET', { assetId });
  };

  const handleTakeLoan = () => {
    sounds.playClick();
    socket.sendGameAction('SECRET_AUCTION', 'TAKE_LOAN');
  };

  const handleRepayLoan = () => {
    sounds.playClick();
    socket.sendGameAction('SECRET_AUCTION', 'REPAY_LOAN');
  };

  const isResearched = (assetId: string) => myState?.researchedAssetIds.includes(assetId);

  // Calculate Net Worth
  const totalAssetValue = (myState?.assets || []).reduce(
    (acc, a) => acc + (a.trueValue || a.estimatedMin),
    0
  );
  const netWorth = (myState?.cash || 0) + totalAssetValue - (myState?.debt || 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16">
      {/* Interactive Step Guide & Field Manual */}
      <GameStepGuide
        gameType="SECRET_AUCTION"
        phase={gameState.phase}
      />

      {/* Top Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            ROUND {gameState.round} OF {gameState.maxRounds}
          </span>
          <h2 className="text-base font-extrabold text-white mt-1">SECRET AUCTION</h2>
          <p className="text-xs text-slate-400">
            Phase: <strong className="text-amber-400 uppercase">{gameState.phase.replace('_', ' ')}</strong>
          </p>
        </div>

        {/* Autoritative Timer with Anti-Snipe alert */}
        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 py-2.5 px-4 rounded-2xl relative overflow-hidden">
          {gameState.antiSnipeActive && (
            <span className="absolute top-1 text-[9px] font-black text-rose-400 uppercase tracking-widest animate-pulse">
              ⚡ ANTI-SNIPE OVERTIME (+5s)
            </span>
          )}
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-amber-400" /> Bidding Timer
          </span>
          <span
            className={`font-mono text-2xl font-black ${
              timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-400'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}
          </span>
        </div>

        {/* Net Worth & Hint Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-xs">
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block font-sans">Total Net Worth</span>
            <span className="font-black text-amber-400 text-sm">
              🪙 {netWorth.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenHintModal();
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold font-sans text-xs transition"
          >
            <Lightbulb className="w-3.5 h-3.5" /> Hint
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'LOT', label: '🔨 Active Auction Lot' },
          { id: 'PORTFOLIO', label: `💼 My Holdings (${myState?.assets.length || 0})` },
          { id: 'MARKET', label: '📈 Market Event' },
          { id: 'BANK', label: '🏦 Credit & Debt' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sounds.playClick();
              setActiveTab(tab.id as any);
            }}
            className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Active Auction Lot */}
      {activeTab === 'LOT' && currentLot && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Lot Card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentLot.icon}</span>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {currentLot.category} SECTOR
                  </span>
                  <h3 className="font-extrabold text-xl text-white mt-1">{currentLot.name}</h3>
                </div>
              </div>

              {/* Research Button */}
              {isResearched(currentLot.id) ? (
                <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Due Diligence Verified
                </div>
              ) : (
                <button
                  disabled={(myState?.cash || 0) < 5000}
                  onClick={() => handleResearch(currentLot.id)}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Search className="w-3.5 h-3.5" /> Buy Research (5,000c)
                </button>
              )}
            </div>

            {/* Asset Characteristics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[10px] font-sans">Estimated Range</span>
                <span className="font-bold text-amber-400">
                  {currentLot.estimatedMin / 1000}k–{currentLot.estimatedMax / 1000}k
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[10px] font-sans">True Secret Value</span>
                <span
                  className={`font-black ${
                    currentLot.trueValue ? 'text-emerald-400 text-sm' : 'text-slate-600'
                  }`}
                >
                  {currentLot.trueValue ? `${currentLot.trueValue.toLocaleString()}c` : '🔒 UNRESEARCHED'}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[10px] font-sans">Risk Rating</span>
                <span className="font-bold text-rose-400">{currentLot.risk} / 10</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[10px] font-sans">Income / Round</span>
                <span className="font-bold text-emerald-400">+{currentLot.incomePerRound}c</span>
              </div>
            </div>

            {/* Current High Bid Box */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Standing High Bid:</span>
                <span className="font-mono text-2xl font-black text-amber-400">
                  {gameState.currentHighBid
                    ? `${gameState.currentHighBid.amount.toLocaleString()} Coins`
                    : `Opening: ${currentLot.estimatedMin.toLocaleString()} Coins`}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bidder:{' '}
                  <strong className="text-white">
                    {gameState.currentHighBid?.bidderName || 'None yet'}
                  </strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Your Liquid Cash:</span>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  🪙 {myState?.cash.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bidding Controls */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Place Server-Authoritative Bid
              </span>

              <div className="flex flex-wrap gap-2">
                {[2000, 5000, 10000, 20000].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => {
                      const cur = gameState.currentHighBid?.amount || currentLot.estimatedMin;
                      handlePlaceBid(cur + inc);
                    }}
                    disabled={(myState?.cash || 0) < ((gameState.currentHighBid?.amount || currentLot.estimatedMin) + inc)}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-bold text-xs rounded-xl border border-slate-700 transition"
                  >
                    +{(inc / 1000).toFixed(0)}k Bid
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePlaceBid()}
                disabled={
                  (myState?.cash || 0) <
                  ((gameState.currentHighBid?.amount || currentLot.estimatedMin) + bidIncrement)
                }
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Gavel className="w-4 h-4" /> CONFIRM BID (
                {(
                  (gameState.currentHighBid?.amount || currentLot.estimatedMin) + bidIncrement
                ).toLocaleString()}{' '}
                Coins)
              </button>
            </div>
          </div>

          {/* Live Bid History Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Auction Block Feed
            </h4>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-72 pr-1">
              {gameState.bidHistory.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  No bids logged yet for this lot.
                </div>
              ) : (
                gameState.bidHistory.map((bid, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{bid.bidderName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(bid.timestamp).toLocaleTimeString([], {
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      {bid.amount.toLocaleString()} c
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800">
              Anti-snipe protection active. Server verifies valid balance before logging bid.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Portfolio Holdings */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
              Asset Portfolio & Holdings
            </h3>
            <span className="text-xs text-amber-400 font-mono font-bold">
              Total Holdings Value: {totalAssetValue.toLocaleString()} Coins
            </span>
          </div>

          {myState?.assets.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500 space-y-2">
              <Briefcase className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs">No assets acquired yet. Win lots in the active auction block!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {myState?.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{asset.icon}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Owned
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">{asset.name}</h4>
                    <span className="text-xs text-slate-400">{asset.category} Sector</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Acquired At</span>
                      <span className="text-slate-300">
                        {asset.purchasePrice?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">True Value</span>
                      <span className="text-emerald-400 font-bold">
                        {asset.trueValue?.toLocaleString() || asset.estimatedMin.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Market Event */}
      {activeTab === 'MARKET' && gameState.currentMarketEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-5xl block">{gameState.currentMarketEvent.icon}</span>
            <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              GLOBAL MARKET REPORT
            </span>
            <h3 className="font-black text-2xl text-white">
              {gameState.currentMarketEvent.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {gameState.currentMarketEvent.description}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">Affected Sector:</span>
            <span className="font-bold text-amber-400">
              {gameState.currentMarketEvent.affectedCategory}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">Sector Valuation Swing:</span>
            <span
              className={`font-black text-sm ${
                gameState.currentMarketEvent.multiplier >= 1 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {gameState.currentMarketEvent.multiplier >= 1
                ? `+${Math.round((gameState.currentMarketEvent.multiplier - 1) * 100)}%`
                : `-${Math.round((1 - gameState.currentMarketEvent.multiplier) * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Bank Loans & Debt */}
      {activeTab === 'BANK' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">International Credit Facility</h3>
              <p className="text-xs text-slate-400">Leverage debt to outbid competitors</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Current Outstanding Debt</span>
              <span className="font-black text-rose-400 text-lg">
                🪙 {myState?.debt.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Interest Rate</span>
              <span className="font-black text-amber-400 text-lg">8% / Round</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleTakeLoan}
              disabled={(myState?.debt || 0) >= 50000}
              className="py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              Borrow 25,000 Coins
            </button>
            <button
              onClick={handleRepayLoan}
              disabled={(myState?.debt || 0) <= 0 || (myState?.cash || 0) < 25000}
              className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
            >
              Repay 25,000 Coins
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
