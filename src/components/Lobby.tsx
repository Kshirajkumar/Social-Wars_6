import React, { useState } from 'react';
import {
  Crown,
  Check,
  Play,
  Copy,
  Share2,
  Users,
  Settings2,
  Shield,
  Trash2,
  Sliders,
  Sparkles,
  ExternalLink,
  QrCode,
  AlertCircle,
  Smartphone,
  Bot,
} from 'lucide-react';
import { RoomState, GameType, GlobalDifficulty, RoomSettings } from '../types/game';
import { socket } from '../services/socket';
import { sounds } from '../services/sound';
import { getPublicShareUrl, isPrivateDevEnvironment } from '../services/shareUrl';
import { ShareModal } from './common/ShareModal';

interface LobbyProps {
  room: RoomState;
  currentPlayerId: string;
  isHost: boolean;
  onOpenRules: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentPlayerId,
  isHost,
  onOpenRules,
}) => {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const playersList = Object.values(room.players);
  const playerCount = playersList.length;
  const isReadyToStart = playerCount >= 3 && playerCount <= 5;
  const me = room.players[currentPlayerId];
  const isDev = isPrivateDevEnvironment();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShareLink = () => {
    const url = getPublicShareUrl(room.roomCode);
    navigator.clipboard.writeText(url);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTestTab = () => {
    sounds.playClick();
    const url = `${window.location.origin}?room=${room.roomCode}&testPlayer=${Math.floor(10 + Math.random() * 90)}`;
    window.open(url, '_blank');
  };

  const handleAddBot = () => {
    sounds.playClick();
    socket.addBotPlayer();
  };

  const handleToggleReady = () => {
    sounds.playClick();
    socket.setReady();
  };

  const handleStartGame = () => {
    sounds.playGavel();
    socket.startGame();
  };

  const handleUpdateSettings = (partial: Partial<RoomSettings>) => {
    sounds.playClick();
    socket.updateSettings(partial);
  };

  const handleKick = (targetId: string) => {
    sounds.playClick();
    socket.kickPlayer(targetId);
  };

  const handleTransfer = (targetId: string) => {
    sounds.playClick();
    socket.transferHost(targetId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Banner: Room Code & Quick Sharing */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            MULTIPLAYER LOBBY ({playerCount}/5 PLAYERS)
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ROOM <span className="text-amber-400 font-mono tracking-widest">{room.roomCode}</span>
          </h1>

          <p className="text-xs text-slate-400 max-w-md">
            Connect from any smartphone or browser tab. Requires 3 to 5 players to launch.
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              setShowShareModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-purple-600/25"
          >
            <QrCode className="w-4 h-4" /> QR Code & Phone Invite
          </button>

          <button
            onClick={handleCopyCode}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            Copy Room Code
          </button>

          <button
            onClick={handleCopyShareLink}
            className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95"
          >
            <Share2 className="w-4 h-4" /> Copy Public Link
          </button>

          <button
            onClick={handleOpenTestTab}
            className="px-4 py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95"
            title="Open another player window in a new browser tab to test 3-5 players easily"
          >
            <ExternalLink className="w-4 h-4" /> +1 Test Player Tab
          </button>

          {isHost && playerCount < 5 && (
            <button
              onClick={handleAddBot}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95"
              title="Add an AI agent bot immediately to this room"
            >
              <Bot className="w-4 h-4" /> + Add AI Bot
            </button>
          )}
        </div>
      </div>

      {/* Helpful Mobile Access Tip for Host */}
      {isDev && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-emerald-300">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Playing with Friends on Other Phones?</span>
              Send them the <strong className="text-emerald-400 font-mono">Public Invite Link</strong> (or have them scan the QR code). Do not copy the private <code className="text-slate-400">ais-dev</code> browser URL, which requires your Google developer login.
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setShowShareModal(true);
            }}
            className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
          >
            View QR & Link
          </button>
        </div>
      )}

      {/* Main Grid: Players List (5 Slots) and Host Match Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Players List (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Connected Players ({playerCount}/5)
            </h3>
            <span className="text-xs text-slate-500 font-medium">Min 3 • Max 5</span>
          </div>

          <div className="space-y-2.5">
            {playersList.map((player) => {
              const isMe = player.id === currentPlayerId;

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border-2 ${
                        player.badgeFrame || 'border-slate-700'
                      }`}
                    >
                      {player.avatar}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{player.name}</span>
                        {player.isHost && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-400" /> HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-400/80 font-medium">
                        {player.title || 'Rookie Tactician'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ready Status */}
                    {player.isReady ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-lg">
                        Waiting
                      </span>
                    )}

                    {/* Host Kick / Transfer Actions on other players */}
                    {isHost && !isMe && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTransfer(player.id)}
                          title="Transfer Room Host"
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleKick(player.id)}
                          title="Kick Player"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Slots Fillers up to 5 */}
            {Array.from({ length: Math.max(0, 5 - playerCount) }).map((_, idx) => (
              <div
                key={`empty_${idx}`}
                className="p-3.5 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/20 flex items-center justify-between text-slate-500 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-700">
                    +
                  </div>
                  <span>Empty Player Slot {playerCount + idx + 1}</span>
                </div>
                {isHost ? (
                  <button
                    onClick={handleAddBot}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 font-bold text-[11px] flex items-center gap-1 transition active:scale-95"
                  >
                    <Bot className="w-3.5 h-3.5" /> + Add AI Bot
                  </button>
                ) : (
                  <span className="text-[11px] italic">Awaiting connection</span>
                )}
              </div>
            ))}
          </div>

          {/* Player Ready Toggle Button */}
          <div className="pt-2">
            <button
              onClick={handleToggleReady}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 ${
                me?.isReady
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <Check className="w-4 h-4" /> {me?.isReady ? 'READY TO PLAY ✓' : 'CLICK TO READY UP'}
            </button>
          </div>
        </div>

        {/* Host Controls & Match Settings (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" /> Match Settings
              </h3>
              {!isHost && (
                <span className="text-[11px] text-slate-500 font-medium">Host controlled</span>
              )}
            </div>

            {/* Game Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Select Experience:</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: 'BLUFF_CITY',
                    name: '🕵️ Bluff City',
                    subtitle: 'Social Deduction & Hidden Roles',
                  },
                  {
                    id: 'MURDER_MYSTERY',
                    name: '🔪 Blackwood Manor',
                    subtitle: 'Procedural Murder Mystery & Escape',
                  },
                  {
                    id: 'SECRET_AUCTION',
                    name: '🃏 Secret Auction',
                    subtitle: 'Valuations, Debt & Market Events',
                  },
                  {
                    id: 'DRAW_AND_GUESS',
                    name: '🎨 Live Draw & Guess',
                    subtitle: 'Live Drawing, Masked Hints & Chat Guessing',
                  },
                ].map((game) => (
                  <button
                    key={game.id}
                    disabled={!isHost}
                    onClick={() => handleUpdateSettings({ selectedGame: game.id as GameType })}
                    className={`p-3 rounded-2xl border text-left transition ${
                      room.settings.selectedGame === game.id
                        ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{game.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{game.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Game Field Guide Card */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  💡 Quick Game Guide
                </span>
                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenRules();
                  }}
                  className="text-[10px] text-cyan-400 hover:text-white font-bold"
                >
                  Full Rules Guide →
                </button>
              </div>

              {room.settings.selectedGame === 'BLUFF_CITY' && (
                <div className="space-y-1 text-slate-300">
                  <p className="font-semibold text-white">
                    🎯 Win Goal: Fulfill your secret role objective or unmask the Criminal.
                  </p>
                  <p className="text-[11px]">
                    1. Visit city locations to gather influence/coins. 2. Pass decrees & negotiate. 3. Vote & accuse!
                  </p>
                </div>
              )}

              {room.settings.selectedGame === 'MURDER_MYSTERY' && (
                <div className="space-y-1 text-slate-300">
                  <p className="font-semibold text-white">
                    🎯 Win Goal: Find physical clues in rooms to unmask the Manor Killer!
                  </p>
                  <p className="text-[11px]">
                    1. Move across 9 mansion rooms. 2. Search for forensics. 3. Submit formal accusation or escape!
                  </p>
                </div>
              )}

              {room.settings.selectedGame === 'SECRET_AUCTION' && (
                <div className="space-y-1 text-slate-300">
                  <p className="font-semibold text-white">
                    🎯 Win Goal: Outbid rivals for high-yield assets to maximize Net Worth.
                  </p>
                  <p className="text-[11px]">
                    1. Buy research to reveal true asset values. 2. Place high bids before timer expires. 3. Manage loans!
                  </p>
                </div>
              )}

              {room.settings.selectedGame === 'DRAW_AND_GUESS' && (
                <div className="space-y-1 text-slate-300">
                  <p className="font-semibold text-white">
                    🎯 Win Goal: Score highest points across 10 rounds of live drawing and chat guessing.
                  </p>
                  <p className="text-[11px]">
                    1. Artist draws live on canvas. 2. Other players guess word in chat. 3. Top 3 guessers win +1000/+700/+500 Pts!
                  </p>
                </div>
              )}
            </div>

            {/* Global Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Difficulty:</label>
              <select
                disabled={!isHost}
                value={room.settings.difficulty}
                onChange={(e) =>
                  handleUpdateSettings({ difficulty: e.target.value as GlobalDifficulty })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50"
              >
                <option value="BEGINNER">🟢 Beginner (Generous timers, clear clues)</option>
                <option value="EASY">🔵 Easy (Standard clues)</option>
                <option value="INTERMEDIATE">🟡 Intermediate (Conflicting intel)</option>
                <option value="HARD">🟠 Hard (Advanced abilities & deception)</option>
                <option value="MASTER">🔴 Master (High stakes, deep deduction)</option>
              </select>
            </div>

            {/* Level Selector (1 to 20) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-300">Level Progression:</span>
                <span className="font-mono font-bold text-amber-400">
                  Level {room.settings.level} / 20
                </span>
              </div>
              <input
                disabled={!isHost}
                type="range"
                min={1}
                max={20}
                value={room.settings.level}
                onChange={(e) => handleUpdateSettings({ level: Number(e.target.value) })}
                className="w-full accent-amber-500 disabled:opacity-50"
              />
            </div>

            {/* Hints Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">5-Tier Hint System</span>
                <span className="text-[11px] text-slate-500">Allow players to buy tactical clues</span>
              </div>
              <input
                disabled={!isHost}
                type="checkbox"
                checked={room.settings.hintsEnabled}
                onChange={(e) => handleUpdateSettings({ hintsEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </div>
          </div>

          {/* Launch Match Button */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            {playerCount < 3 && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl font-medium">
                <Bot className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>
                  {playerCount === 1 ? 'Solo mode:' : `${playerCount}/5 players:`} Starting will auto-fill with tactical AI bots to reach the 3-player minimum.
                </span>
              </div>
            )}

            {isHost ? (
              <button
                onClick={handleStartGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-500/20 transition active:scale-95 flex items-center justify-center gap-2 tracking-wider cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                {playerCount < 3
                  ? `START MATCH (AUTO-FILL BOTS)`
                  : `START MATCH (${playerCount} PLAYERS)`}
              </button>
            ) : (
              <div className="text-center py-3 text-xs text-slate-400 font-medium">
                👑 Waiting for Host ({playersList.find((p) => p.isHost)?.name || 'Host'}) to start match...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code and Share Invite Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomCode={room.roomCode}
      />
    </div>
  );
};
