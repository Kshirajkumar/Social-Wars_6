import React, { useState, useEffect } from 'react';
import {
  Skull,
  Search,
  Key,
  Shield,
  Clock,
  Lightbulb,
  FileQuestion,
  Fingerprint,
  Video,
  FileText,
  AlertTriangle,
  Lock,
  DoorOpen,
  Send,
  Eye,
} from 'lucide-react';
import { MurderMysteryGameState, RoomPlayer, EvidenceItem } from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';

interface MurderMysteryGameProps {
  gameState: MurderMysteryGameState;
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  isHost: boolean;
  onOpenHintModal: () => void;
}

export const MurderMysteryGame: React.FC<MurderMysteryGameProps> = ({
  gameState,
  players,
  currentPlayerId,
  isHost,
  onOpenHintModal,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedSuspect, setSelectedSuspect] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState('');
  const [confidence, setConfidence] = useState(85);
  const [reasoning, setReasoning] = useState('');
  const [activeTab, setActiveTab] = useState<'MANSION' | 'EVIDENCE' | 'DOSSIER' | 'ESCAPE'>('MANSION');

  const myState = gameState.playerStates[currentPlayerId];
  const isMurderer = myState?.role === 'MURDERER';

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

  // Switch to ESCAPE tab automatically if Escape phase starts
  useEffect(() => {
    if (gameState.phase === 'ESCAPE') {
      setActiveTab('ESCAPE');
      sounds.playSuspense();
    }
  }, [gameState.phase]);

  const handleMoveRoom = (roomId: string) => {
    sounds.playClick();
    socket.sendGameAction('MURDER_MYSTERY', 'MOVE_ROOM', { roomId });
  };

  const handleSearchRoom = () => {
    sounds.playClueFound();
    socket.sendGameAction('MURDER_MYSTERY', 'SEARCH_ROOM');
  };

  const handleMurdererSabotage = (type: 'DESTROY_CLUE' | 'BLOCK_DOOR', id: string) => {
    sounds.playGavel();
    socket.sendGameAction('MURDER_MYSTERY', 'MURDERER_SABOTAGE', {
      sabotageType: type,
      evidenceId: type === 'DESTROY_CLUE' ? id : undefined,
      roomId: type === 'BLOCK_DOOR' ? id : undefined,
    });
  };

  const handleSubmitAccusation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspect || !selectedEvidence) return;
    sounds.playGavel();
    socket.sendGameAction('MURDER_MYSTERY', 'SUBMIT_ACCUSATION', {
      suspectId: selectedSuspect,
      evidenceId: selectedEvidence,
      confidence,
      reasoning: reasoning || 'Fingerprint and alibi mismatch detected.',
    });
  };

  const handleEscapeMove = (targetRoom: string) => {
    sounds.playClick();
    socket.sendGameAction('MURDER_MYSTERY', 'ESCAPE_MOVE', { targetRoom });
  };

  const discoveredClues = Object.values(gameState.evidenceBoard).filter((ev) =>
    ev.discoveredBy.includes(currentPlayerId)
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            CASE: THE BLACKWOOD INQUEST
          </span>
          <h2 className="text-base font-extrabold text-white mt-1">
            {gameState.caseTitle}
          </h2>
          <p className="text-xs text-slate-400">
            Phase: <strong className="text-rose-400 uppercase">{gameState.phase}</strong>
          </p>
        </div>

        {/* Autoritative Timer */}
        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 py-2.5 px-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-400" /> Phase Closes In
          </span>
          <span
            className={`font-mono text-2xl font-black ${
              timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}
          </span>
        </div>

        {/* Role & Hint button */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block">Assigned Role</span>
            <span
              className={`font-black text-xs ${
                isMurderer ? 'text-rose-500 font-mono tracking-wider' : 'text-cyan-400'
              }`}
            >
              {isMurderer ? '🔪 THE MURDERER' : '🔎 INVESTIGATOR'}
            </span>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenHintModal();
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition"
          >
            <Lightbulb className="w-3.5 h-3.5" /> Hint
          </button>
        </div>
      </div>

      {/* Secret Card: Personal Dark Secret & Alibi */}
      {myState && (
        <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Skull className="w-4 h-4 text-rose-400" />
              <span>Victim: <strong className="text-white">{gameState.victimName}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Scene: <strong className="text-rose-400">{gameState.crimeSceneRoom}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Time: <strong className="text-white">{gameState.timeOfMurder}</strong></span>
            </div>

            {isMurderer && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Sabotage Points: {myState.murdererActionPoints || 0}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                🤫 Your Private Dark Secret
              </span>
              <p className="text-slate-300 leading-relaxed font-medium">{myState.secret}</p>
              <p className="text-[10px] text-slate-500 italic">
                (Others may discover this and suspect you, even if you are innocent!)
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                🛡️ Your Stated Alibi
              </span>
              <p className="text-slate-300 leading-relaxed font-medium">{myState.alibi}</p>
              <p className="text-[10px] text-slate-500 italic">
                (Stick to your story during table discussions)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'MANSION', label: '🏰 Mansion Map' },
          { id: 'EVIDENCE', label: `🔬 Evidence Locker (${discoveredClues.length})` },
          { id: 'DOSSIER', label: '⚖️ Formal Accusation' },
          ...(gameState.phase === 'ESCAPE' ? [{ id: 'ESCAPE', label: '🚨 90s ESCAPE PHASE' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sounds.playClick();
              setActiveTab(tab.id as any);
            }}
            className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Mansion Map */}
      {activeTab === 'MANSION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
              Blackwood Estate Floorplan
            </h3>
            <span className="text-xs text-slate-400">
              You are currently in:{' '}
              <strong className="text-rose-400">
                {gameState.currentRoomLocations.find((r) => r.id === myState?.currentRoom)?.name || 'Grand Hall'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {gameState.currentRoomLocations.map((room) => {
              const isHere = myState?.currentRoom === room.id;
              const visitors = Object.entries(gameState.playerStates).filter(
                ([_, st]) => st.currentRoom === room.id
              );
              const roomClues = Object.values(gameState.evidenceBoard).filter(
                (ev) => ev.locationId === room.id
              );

              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isHere
                      ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{room.icon}</span>
                      {isHere && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          YOU
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-white">{room.name}</h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>Guests:</span>
                      {visitors.length === 0 ? (
                        <span className="italic text-slate-600">Empty</span>
                      ) : (
                        visitors.map(([pid]) => (
                          <span key={pid} className="bg-slate-800 px-1.5 py-0.5 rounded">
                            {players[pid]?.avatar || '👤'}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                    {isHere ? (
                      <button
                        onClick={handleSearchRoom}
                        className="w-full py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Search className="w-3.5 h-3.5" /> Search Room for Clues
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMoveRoom(room.id)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                      >
                        Walk to {room.name}
                      </button>
                    )}

                    {/* Murderer Sabotage Option */}
                    {isMurderer && isHere && (myState?.murdererActionPoints || 0) > 0 && (
                      <button
                        onClick={() => handleMurdererSabotage('BLOCK_DOOR', room.id)}
                        className="w-full py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-[11px] rounded-xl transition"
                      >
                        🔒 Jam Room Locks (Sabotage)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Evidence Locker */}
      {activeTab === 'EVIDENCE' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
            Recovered Physical & Digital Forensics
          </h3>

          {discoveredClues.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">No evidence discovered yet. Search rooms across the mansion!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {discoveredClues.map((clue) => (
                <div
                  key={clue.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {clue.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Found in {clue.locationId.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{clue.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{clue.description}</p>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-400 font-medium">
                    Analysis: {clue.clueSummary}
                  </div>

                  {/* Murderer Sabotage Destroy Clue */}
                  {isMurderer && (myState?.murdererActionPoints || 0) > 0 && (
                    <button
                      onClick={() => handleMurdererSabotage('DESTROY_CLUE', clue.id)}
                      className="mt-2 w-full py-1 text-[11px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg font-bold transition"
                    >
                      Destroy This Clue (1 AP)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Formal Accusation Form */}
      {activeTab === 'DOSSIER' && (
        <form
          onSubmit={handleSubmitAccusation}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-xl mx-auto"
        >
          <div className="text-center space-y-1">
            <h3 className="font-black text-lg text-white">SUBMIT FORMAL INQUEST ACCUSATION</h3>
            <p className="text-xs text-slate-400">
              Submit your suspect, key evidence, and logical deduction. Correct reasoning yields high XP.
            </p>
          </div>

          {/* Suspect Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Primary Suspect:</label>
            <select
              value={selectedSuspect}
              onChange={(e) => setSelectedSuspect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">Select guest...</option>
              {Object.values(players)
                .filter((p) => p.id !== currentPlayerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.avatar} {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Evidence Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Supporting Evidence:</label>
            <select
              value={selectedEvidence}
              onChange={(e) => setSelectedEvidence(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">Select piece of evidence...</option>
              {discoveredClues.map((clue) => (
                <option key={clue.id} value={clue.id}>
                  {clue.name} ({clue.type})
                </option>
              ))}
            </select>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-300">Confidence Rating:</span>
              <span className="font-mono font-bold text-amber-400">{confidence}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Reasoning */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Deductive Reasoning:</label>
            <textarea
              rows={3}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain how the timeline, alibi, and physical evidence connect to this suspect..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedSuspect || !selectedEvidence}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-rose-600/20 active:scale-95"
          >
            CONFIRM FORMAL ACCUSATION
          </button>
        </form>
      )}

      {/* Tab 4: 90s Escape Phase */}
      {activeTab === 'ESCAPE' && (
        <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              🚨 90-SECOND ESCAPE SEQUENCE
            </span>
            <h3 className="font-black text-2xl text-white">THE KILLER ATTEMPTS TO FLEE!</h3>
            <p className="text-xs text-slate-300">
              {isMurderer
                ? 'Run to the Garden exit before investigators trigger manor lockdowns!'
                : 'Coordinate with investigators to corner the killer before they reach the Garden gate!'}
            </p>
          </div>

          {/* Escape Rooms Grid */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            {gameState.currentRoomLocations.map((loc) => {
              const isTargetExit = loc.id === 'GARDEN';
              const isKillerHere = gameState.escapePath?.currentRoom === loc.id;
              const isBlocked = gameState.escapePath?.blockedRooms.includes(loc.id);

              return (
                <div
                  key={loc.id}
                  className={`p-3 rounded-2xl border text-center transition ${
                    isKillerHere
                      ? 'bg-rose-950 border-rose-500 shadow-lg shadow-rose-500/30'
                      : isBlocked
                      ? 'bg-slate-950 border-slate-800 opacity-40'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <span className="text-2xl">{loc.icon}</span>
                  <h4 className="font-bold text-xs text-white mt-1">{loc.name}</h4>
                  {isTargetExit && (
                    <span className="text-[9px] font-black text-emerald-400 block">EXIT GATE</span>
                  )}
                  {isKillerHere && (
                    <span className="text-[9px] font-black text-rose-400 block animate-pulse">
                      📍 KILLER HERE
                    </span>
                  )}

                  {isMurderer && !isKillerHere && !isBlocked && (
                    <button
                      onClick={() => handleEscapeMove(loc.id)}
                      className="mt-2 w-full py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg transition"
                    >
                      Sprint Here
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
