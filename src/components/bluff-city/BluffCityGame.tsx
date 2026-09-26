import React, { useState, useEffect } from 'react';
import {
  Shield,
  Coins,
  MapPin,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Vote,
  FileText,
  UserCheck,
  Eye,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { BluffCityGameState, RoomPlayer, BluffLocationId } from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';

interface BluffCityGameProps {
  gameState: BluffCityGameState;
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  isHost: boolean;
  onOpenHintModal: () => void;
}

const CITY_LOCATIONS: {
  id: BluffLocationId;
  name: string;
  icon: string;
  desc: string;
  actionTitle: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}[] = [
  {
    id: 'CITY_HALL',
    name: 'City Hall',
    icon: '🏛️',
    desc: 'Seat of municipal governance. Pass policies and build political reputation.',
    actionTitle: 'Lobby for Emergency Decree',
    risk: 'LOW',
  },
  {
    id: 'BANK',
    name: 'Offshore Bank Vault',
    icon: '🏦',
    desc: 'High security financial hub. Audit records or withdraw clandestine reserves.',
    actionTitle: 'Launder Municipal Reserves',
    risk: 'MEDIUM',
  },
  {
    id: 'NEWS_AGENCY',
    name: 'Bluff City Chronicle',
    icon: '📰',
    desc: 'Press offices and whistleblowers. Broadcast exposés or fabricate rumors.',
    actionTitle: 'Publish Confidential Scoop',
    risk: 'MEDIUM',
  },
  {
    id: 'BLACK_MARKET',
    name: 'Shadow Bazaar',
    icon: '🕶️',
    desc: 'Underground dock warehouse. Massive illicit profits, but destroys city stability.',
    actionTitle: 'Trade Contraband Assets',
    risk: 'HIGH',
  },
  {
    id: 'HOTEL',
    name: 'The Obsidian Grand',
    icon: '🏨',
    desc: 'Luxury suites for clandestine meetings, wiretapping, and alliances.',
    actionTitle: 'Bug Private Presidential Suite',
    risk: 'MEDIUM',
  },
  {
    id: 'PRECINCT',
    name: 'Metro Police Precinct',
    icon: '🚨',
    desc: 'Interrogation rooms and syndicate holding cells.',
    actionTitle: 'Run Background Check',
    risk: 'LOW',
  },
];

export const BluffCityGame: React.FC<BluffCityGameProps> = ({
  gameState,
  players,
  currentPlayerId,
  isHost,
  onOpenHintModal,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [pactInput, setPactInput] = useState('');
  const [selectedAccused, setSelectedAccused] = useState('');

  const myState = gameState.playerStates[currentPlayerId];
  const me = players[currentPlayerId];

  // Authoritative server timer ticker
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

  const handleVisitLocation = (locId: BluffLocationId) => {
    sounds.playClick();
    socket.sendGameAction('BLUFF_CITY', 'MOVE_LOCATION', { locationId: locId });
  };

  const handleVoteDecree = (vote: 'YES' | 'NO') => {
    sounds.playClick();
    socket.sendGameAction('BLUFF_CITY', 'VOTE_DECREE', { vote });
  };

  const handleMakePact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pactInput.trim()) return;
    sounds.playClick();
    socket.sendGameAction('BLUFF_CITY', 'MAKE_PACT', { statement: pactInput.trim() });
    setPactInput('');
  };

  const handleAccuse = () => {
    if (!selectedAccused) return;
    sounds.playGavel();
    socket.sendGameAction('BLUFF_CITY', 'ACCUSE_SUSPECT', { targetId: selectedAccused });
    setSelectedAccused('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16">
      {/* Top Status Bar: Round, Phase, Server Countdown & City Stability */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Phase Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ROUND {gameState.round} OF {gameState.maxRounds}
            </span>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {gameState.phase.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {gameState.phase === 'ACTION'
              ? 'Visit a city location to execute district maneuvers.'
              : gameState.phase === 'DISCUSSION'
              ? 'Negotiate, lie, form public pacts, and align votes.'
              : 'Vote on Council Decrees and unmask syndicate criminals.'}
          </p>
        </div>

        {/* Server Countdown */}
        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 py-2.5 px-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Phase Closes In
          </span>
          <span
            className={`font-mono text-2xl font-black ${
              timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}
          </span>
        </div>

        {/* City Stability Meter */}
        <div className="space-y-1.5 bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> City Stability
            </span>
            <span
              className={`font-mono font-black ${
                gameState.cityStability > 60
                  ? 'text-emerald-400'
                  : gameState.cityStability > 30
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {gameState.cityStability}%
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                gameState.cityStability > 60
                  ? 'bg-emerald-500'
                  : gameState.cityStability > 30
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${gameState.cityStability}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            {gameState.cityStability < 40 ? '⚠️ High Crime: Black Market profits +50%' : 'Normal municipal order'}
          </span>
        </div>
      </div>

      {/* Player Confidential Dossier Card (Private Role & Objective) */}
      {myState && (
        <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-2xl border border-purple-500/40">
                {myState.role === 'DETECTIVE'
                  ? '🕵️'
                  : myState.role === 'CRIMINAL'
                  ? '🦹'
                  : myState.role === 'JOURNALIST'
                  ? '📰'
                  : myState.role === 'POLITICIAN'
                  ? '🏛️'
                  : '🕶️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">
                    TOP SECRET ROLE
                  </span>
                  <h3 className="font-black text-lg text-white tracking-wide">
                    {myState.role || 'CITIZEN'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Public Cover: Claiming to be{' '}
                  <span className="text-cyan-400 font-semibold">{myState.publicClaimRole || 'Agent'}</span>
                </p>
              </div>
            </div>

            {/* In-match stats */}
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-500 block text-[10px]">City Coins</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> {myState.cityCoins.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-500 block text-[10px]">⭐ Reputation</span>
                <span className="font-bold text-purple-300">{myState.reputation} / 100</span>
              </div>
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenHintModal();
                }}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-1 font-bold text-xs transition"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Hint
              </button>
            </div>
          </div>

          {/* Secret Objective Banner */}
          {myState.objective && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300">
                    Secret Objective: {myState.objective.title}
                  </span>
                  <span className="font-mono text-[10px] text-amber-400 font-semibold">
                    +{myState.objective.rewardScore} Pts
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{myState.objective.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* City Locations Board (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" /> City Districts
            </h3>
            <span className="text-xs text-slate-400">
              Current Location:{' '}
              <strong className="text-white">{myState?.currentLocation || 'City Hall'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CITY_LOCATIONS.map((loc) => {
              const isHere = myState?.currentLocation === loc.id;
              const visitors = Object.entries(gameState.playerStates).filter(
                ([_, st]) => st.currentLocation === loc.id
              );

              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isHere
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{loc.icon}</span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{loc.name}</h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              loc.risk === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-400'
                                : loc.risk === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {loc.risk} RISK
                          </span>
                        </div>
                      </div>

                      {isHere && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          YOU ARE HERE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{loc.desc}</p>
                  </div>

                  {/* Presence & Action Button */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Present:</span>
                      {visitors.length === 0 ? (
                        <span className="italic">Nobody</span>
                      ) : (
                        visitors.map(([pid]) => (
                          <span
                            key={pid}
                            title={players[pid]?.name}
                            className="bg-slate-800 px-1.5 py-0.5 rounded text-xs"
                          >
                            {players[pid]?.avatar || '👤'}
                          </span>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => handleVisitLocation(loc.id)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                        isHere
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {loc.actionTitle}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Active Decree & Public Pacts */}
        <div className="space-y-4">
          {/* Active City Council Decree */}
          {gameState.activeDecree && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-amber-400" />
                <h4 className="font-extrabold text-sm text-white">Council Decree</h4>
              </div>

              <div>
                <h5 className="font-bold text-xs text-amber-300">{gameState.activeDecree.title}</h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {gameState.activeDecree.description}
                </p>
                <div className="mt-2 text-[11px] font-mono text-cyan-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {gameState.activeDecree.effectDescription}
                </div>
              </div>

              {/* Vote buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-bold text-xs">
                <button
                  onClick={() => handleVoteDecree('YES')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                    myState?.votesCast === 'YES'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> YES (
                  {gameState.activeDecree.yesVotes.length})
                </button>
                <button
                  onClick={() => handleVoteDecree('NO')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                    myState?.votesCast === 'NO'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> NO (
                  {gameState.activeDecree.noVotes.length})
                </button>
              </div>
            </div>
          )}

          {/* Accuse Suspect Module */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" /> Accuse Syndicate Suspect
            </h4>
            <p className="text-xs text-slate-400">
              Formally accuse another player. Accusing correctly grants +2,500 Score; a false claim hurts your reputation.
            </p>

            <div className="space-y-2">
              <select
                value={selectedAccused}
                onChange={(e) => setSelectedAccused(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">Select suspect...</option>
                {Object.values(players)
                  .filter((p) => p.id !== currentPlayerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.avatar} {p.name}
                    </option>
                  ))}
              </select>

              <button
                disabled={!selectedAccused}
                onClick={handleAccuse}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition active:scale-95 shadow"
              >
                Formal Accusation
              </button>
            </div>
          </div>

          {/* Public Pacts & Intel Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" /> Public Pacts & Intel
            </h4>

            {/* Form Pact */}
            <form onSubmit={handleMakePact} className="flex gap-2">
              <input
                type="text"
                value={pactInput}
                onChange={(e) => setPactInput(e.target.value)}
                placeholder="Declare public agreement or bluff..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!pactInput.trim()}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition"
              >
                Pact
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {gameState.recentActions.slice(0, 6).map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 leading-snug"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
