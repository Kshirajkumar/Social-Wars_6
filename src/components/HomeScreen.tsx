import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Key,
  ArrowRight,
  ShieldCheck,
  Play,
  HelpCircle,
  Trophy,
  Loader2,
} from 'lucide-react';
import { socket } from '../services/socket';
import { sounds } from '../services/sound';

interface HomeScreenProps {
  onOpenRules: () => void;
  onOpenLeaderboard: () => void;
}

const DEFAULT_AVATARS = ['🐺', '🦊', '🦁', '🐯', '🦉', '🕵️', '🧐', '🥷'];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenRules, onOpenLeaderboard }) => {
  const [tab, setTab] = useState<'JOIN' | 'CREATE'>('CREATE');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🐺');
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubError = socket.on('ERROR', (data) => {
      setErrorMsg(data.message);
      setIsSubmitting(false);
    });

    return () => {
      unsubError();
    };
  }, []);

  // Auto-fill from URL query param if someone clicks a shared link e.g. ?room=X7K92
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    const testPlayerNum = params.get('testPlayer');

    if (roomFromUrl) {
      setRoomCode(roomFromUrl.toUpperCase());
      setTab('JOIN');
    }

    if (testPlayerNum) {
      const avatars = ['🦊', '🦁', '🐯', '🦉', '🥷'];
      setPlayerName(`Agent ${testPlayerNum}`);
      setAvatar(avatars[Number(testPlayerNum) % avatars.length]);
    } else {
      const savedName = localStorage.getItem('sw_player_name');
      if (savedName) setPlayerName(savedName);
    }
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim() || 'Tactician 1';
    localStorage.setItem('sw_player_name', name);
    setErrorMsg('');
    setIsSubmitting(true);
    sounds.playClick();
    socket.createRoom(name, avatar, 'Rookie Tactician');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setErrorMsg('Please enter a 5-character Room Code.');
      return;
    }
    const name = playerName.trim() || `Agent ${Math.floor(10 + Math.random() * 90)}`;
    localStorage.setItem('sw_player_name', name);
    setErrorMsg('');
    setIsSubmitting(true);
    sounds.playClick();
    socket.joinRoom(roomCode.trim(), name, avatar, 'Rookie Tactician');
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            5-Player Digital Game-Night
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            SOCIAL{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400">
              WARS
            </span>
          </h1>

          <p className="text-sm text-slate-400 font-medium">
            Trust Nobody. Read Everyone. Play Smart.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Avatar Selector */}
          <div className="space-y-2 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Choose Persona
            </span>
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setAvatar(av);
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition transform active:scale-95 ${
                    avatar === av
                      ? 'bg-amber-500/20 border-2 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Agent Handle:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Kshiraj, Rahul, Sai..."
              maxLength={18}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Tabs: Create vs Join */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold">
            <button
              onClick={() => {
                sounds.playClick();
                setTab('CREATE');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl transition ${
                tab === 'CREATE'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CREATE ROOM
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setTab('JOIN');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl transition ${
                tab === 'JOIN'
                  ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JOIN ROOM
            </button>
          </div>

          {/* Forms */}
          {tab === 'CREATE' ? (
            <form onSubmit={handleCreateRoom} className="space-y-4 pt-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate a secure room code and invite up to 4 other friends on their phones.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>CREATING SECURE ROOM...</span>
                  </>
                ) : (
                  <>
                    <span>CREATE ROOM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">5-Letter Room Code:</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. X7K92"
                  maxLength={5}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-center font-mono font-black text-lg tracking-widest text-amber-400 uppercase placeholder-slate-600 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={!roomCode.trim() || isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl shadow-lg shadow-purple-600/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>CONNECTING TO ROOM {roomCode}...</span>
                  </>
                ) : (
                  <>
                    <span>ENTER ROOM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Nav Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <button
              onClick={onOpenRules}
              className="text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 font-medium transition"
            >
              <HelpCircle className="w-4 h-4" /> How to Play
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="text-slate-400 hover:text-amber-400 flex items-center gap-1.5 font-medium transition"
            >
              <Trophy className="w-4 h-4" /> Leaderboards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
