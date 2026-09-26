import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Eraser,
  RotateCcw,
  Clock,
  Sparkles,
  Trophy,
  Send,
  CheckCircle2,
  Users,
  Award,
  Vote,
  Crown,
  Lock,
  MessageSquare,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  DrawAndGuessGameState,
  RoomPlayer,
  DrawingStroke,
  ChatMessage,
} from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';
import { GameStepGuide } from '../common/GameStepGuide';

interface DrawAndGuessGameProps {
  gameState: DrawAndGuessGameState;
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  isHost: boolean;
  messages: ChatMessage[];
  onOpenHintModal: () => void;
}

const COLOR_PALETTE = [
  '#000000', // Black
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Yellow
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#78350f', // Brown
];

const BRUSH_SIZES = [
  { size: 3, label: 'S' },
  { size: 6, label: 'M' },
  { size: 12, label: 'L' },
  { size: 24, label: 'XL' },
];

export const DrawAndGuessGame: React.FC<DrawAndGuessGameProps> = ({
  gameState,
  players,
  currentPlayerId,
  isHost,
  messages = [],
  onOpenHintModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [selectedSize, setSelectedSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [guessInput, setGuessInput] = useState('');

  const isDrawer = currentPlayerId === gameState.currentDrawerId;
  const drawerPlayer = players[gameState.currentDrawerId];
  const hasGuessed = gameState.correctGuessers.some((g) => g.playerId === currentPlayerId);

  // Timer Ticker
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

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Render Canvas Strokes
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fill background dark Slate
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines subtle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw all strokes
    gameState.drawingStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? '#0f172a' : stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    redrawCanvas();
  }, [gameState.drawingStrokes]);

  // Canvas Resize Handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse & Touch Coordinates Converter
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || gameState.phase !== 'DRAWING') return;
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentStroke([coords]);
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawing || gameState.phase !== 'DRAWING') return;
    const coords = getCanvasCoords(e);
    setCurrentStroke((prev) => [...prev, coords]);
  };

  const handleEndDraw = () => {
    if (!isDrawer || !isDrawing || gameState.phase !== 'DRAWING') return;
    setIsDrawing(false);

    if (currentStroke.length >= 2) {
      const newStroke: DrawingStroke = {
        id: `stroke_${Date.now()}_${Math.random()}`,
        points: currentStroke,
        color: selectedColor,
        brushSize: selectedSize,
        isEraser,
      };
      socket.sendGameAction('DRAW_AND_GUESS', 'DRAW_STROKE', { stroke: newStroke });
    }
    setCurrentStroke([]);
  };

  const handleClearCanvas = () => {
    if (!isDrawer || gameState.phase !== 'DRAWING') return;
    sounds.playClick();
    socket.sendGameAction('DRAW_AND_GUESS', 'CLEAR_CANVAS');
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isDrawer || hasGuessed || gameState.phase !== 'DRAWING') return;
    sounds.playClick();
    socket.sendChat(guessInput.trim());
    setGuessInput('');
  };

  const handleVoteArtist = (candidateId: string) => {
    sounds.playClick();
    socket.sendGameAction('DRAW_AND_GUESS', 'VOTE_ARTIST', { candidatePlayerId: candidateId });
  };

  // Real players list for voting & ranking
  const realPlayers = Object.values(players).filter(
    (p) => !p.id.toLowerCase().includes('bot') && !p.id.toLowerCase().includes('ai')
  );
  const activePlayersList = realPlayers.length > 0 ? realPlayers : Object.values(players);

  // Sorted players by cumulative score
  const sortedPlayers = [...activePlayersList].sort((a, b) => (b.score || 0) - (a.score || 0));

  /* ==================== 1. ARTIST SELECTION VOTING POLL PHASE ==================== */
  if (gameState.phase === 'ARTIST_POLL') {
    const votesMap = gameState.artistVotes || {};
    const myVote = votesMap[currentPlayerId];

    // Tally votes
    const voteTallies: Record<string, number> = {};
    Object.values(votesMap).forEach((targetId) => {
      voteTallies[targetId] = (voteTallies[targetId] || 0) + 1;
    });

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in zoom-in-95 duration-200">
        <GameStepGuide gameType="DRAW_AND_GUESS" phase="ARTIST_POLL" />

        <div className="bg-gradient-to-br from-slate-900 via-purple-950/80 to-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          {/* Header */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Vote className="w-4 h-4 text-purple-400" /> ROUND {gameState.round} ARTIST POLL
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Vote for the Next Artist! 🎨
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Choose who should draw live on canvas for Round {gameState.round}. The player with the highest votes will be awarded the Artist easel!
            </p>
          </div>

          {/* Voting Timer Countdown */}
          <div className="inline-flex flex-col items-center justify-center bg-slate-950/80 border border-purple-500/30 px-6 py-3 rounded-2xl shadow-inner">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Poll Closing In
            </span>
            <span className="font-mono text-3xl font-black text-amber-400">{timeLeft}s</span>
          </div>

          {/* Player Candidates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {activePlayersList.map((p) => {
              const count = voteTallies[p.id] || 0;
              const isVotedByMe = myVote === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isVotedByMe
                      ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow">
                      {p.avatar}
                    </span>
                    <div className="text-left overflow-hidden">
                      <strong className="text-white text-sm truncate block">{p.name}</strong>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {p.title || 'Mastermind'}
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-400 block mt-0.5">
                        🏆 {(p.score || 0).toLocaleString()} Pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-extrabold text-purple-300 bg-purple-950 px-2.5 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1">
                      <Vote className="w-3.5 h-3.5 text-purple-400" /> {count} {count === 1 ? 'Vote' : 'Votes'}
                    </span>

                    <button
                      onClick={() => handleVoteArtist(p.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                        isVotedByMe
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isVotedByMe ? 'VOTED ✓' : 'VOTE 🗳️'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ==================== 2. OVERALL MATCH FINAL PODIUM LEADERBOARD ==================== */
  if (gameState.phase === 'RESOLUTION') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          {/* Winner Banner */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-widest">
              <Crown className="w-4 h-4 text-amber-400" /> MATCH COMPLETED • 10 ROUNDS
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-amber-400 tracking-wider font-mono">
              FINAL CHAMPIONSHIP PODIUM 🏆
            </h2>
            <p className="text-xs text-slate-400">
              Congratulations to all artists and guessers! Final match scores tallied below.
            </p>
          </div>

          {/* Top 3 Podium Graphics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end pt-4 pb-2 max-w-2xl mx-auto">
            {/* 2nd Place Silver */}
            {sortedPlayers[1] ? (
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 flex flex-col items-center space-y-2 shadow-lg">
                <span className="text-3xl sm:text-4xl">{sortedPlayers[1].avatar}</span>
                <span className="text-xs font-black text-cyan-300 truncate max-w-[100px]">
                  {sortedPlayers[1].name}
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  🥈 2ND PLACE
                </span>
                <span className="font-mono font-black text-xs text-cyan-400">
                  {(sortedPlayers[1].score || 0).toLocaleString()} Pts
                </span>
              </div>
            ) : null}

            {/* 1st Place Gold */}
            {sortedPlayers[0] ? (
              <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-amber-500 rounded-3xl p-5 flex flex-col items-center space-y-2 shadow-2xl scale-105 z-10">
                <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                <span className="text-4xl sm:text-5xl">{sortedPlayers[0].avatar}</span>
                <span className="text-sm font-black text-amber-300 truncate max-w-[120px]">
                  {sortedPlayers[0].name}
                </span>
                <span className="text-xs font-black text-slate-950 bg-amber-400 px-3 py-0.5 rounded-full shadow">
                  🥇 CHAMPION
                </span>
                <span className="font-mono font-black text-base text-amber-400">
                  {(sortedPlayers[0].score || 0).toLocaleString()} Pts
                </span>
              </div>
            ) : null}

            {/* 3rd Place Bronze */}
            {sortedPlayers[2] ? (
              <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 flex flex-col items-center space-y-2 shadow-lg">
                <span className="text-3xl sm:text-4xl">{sortedPlayers[2].avatar}</span>
                <span className="text-xs font-black text-purple-300 truncate max-w-[100px]">
                  {sortedPlayers[2].name}
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  🥉 3RD PLACE
                </span>
                <span className="font-mono font-black text-xs text-purple-400">
                  {(sortedPlayers[2].score || 0).toLocaleString()} Pts
                </span>
              </div>
            ) : null}
          </div>

          {/* Full Standings Table */}
          <div className="space-y-2 pt-4 border-t border-slate-800 text-left">
            <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">
              Full Standings Breakdown
            </h4>
            <div className="space-y-2">
              {sortedPlayers.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-500 w-5 text-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xl">{p.avatar}</span>
                    <div>
                      <strong className="text-white block">{p.name}</strong>
                      <span className="text-[10px] text-slate-400">{p.title || 'Tactician'}</span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {(p.score || 0).toLocaleString()} Pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==================== 3. LIVE DRAWING & GUESSING MAIN GAME VIEW ==================== */
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16 relative">
      {/* Interactive Step Guide Banner */}
      <GameStepGuide gameType="DRAW_AND_GUESS" phase={gameState.phase} />

      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Round & Sector */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ROUND {gameState.round} OF {gameState.maxRounds}
            </span>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {gameState.category} SECTOR
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isDrawer
              ? '🎨 You are the chosen Artist! Draw the word live.'
              : `🔎 ${drawerPlayer?.name || 'Artist'} is drawing. Type guesses in chat!`}
          </p>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 py-2.5 px-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Drawing Time Remaining
          </span>
          <span
            className={`font-mono text-2xl font-black ${
              timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block">Your Match Score</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              🏆 {(players[currentPlayerId]?.score || 0).toLocaleString()} Pts
            </span>
          </div>
        </div>
      </div>

      {/* Secret Word / Hint Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/60 border border-purple-500/30 rounded-3xl p-5 shadow-2xl text-center space-y-2">
        {isDrawer ? (
          <div className="space-y-1 animate-in zoom-in-95">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              🔒 YOUR SECRET WORD TO DRAW
            </span>
            <h2 className="text-3xl font-black text-amber-400 tracking-wider font-mono">
              {gameState.currentWord}
            </h2>
            <p className="text-xs text-slate-300">
              Draw this word on the canvas below. Do not write letters or words!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              🔎 SECRET WORD HINT ({gameState.currentWord.length} LETTERS)
            </span>
            <div className="text-3xl font-black text-cyan-300 tracking-widest font-mono select-none">
              {gameState.maskedWord}
            </div>
            {hasGuessed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> You Guessed It Correctly! Chat is muted for this round.
              </span>
            ) : (
              <p className="text-xs text-slate-400">
                Type your guess in the Live Chat Box on the right! Top 3 correct guessers win points!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Canvas (8 Cols) & Chat Feed (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Canvas Area */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 flex flex-col justify-between">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
            <canvas
              ref={canvasRef}
              onMouseDown={handleStartDraw}
              onMouseMove={handleMoveDraw}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={handleStartDraw}
              onTouchMove={handleMoveDraw}
              onTouchEnd={handleEndDraw}
              className={`w-full h-full block touch-none ${
                isDrawer ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />

            {/* Non-drawer Badge */}
            {!isDrawer && (
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-200 shadow">
                <span className="text-lg">{drawerPlayer?.avatar || '🎨'}</span>
                <span>{drawerPlayer?.name || 'Artist'} is drawing live...</span>
              </div>
            )}
          </div>

          {/* Drawer Tools */}
          {isDrawer && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Palette className="w-4 h-4 text-purple-400 shrink-0" />
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        sounds.playClick();
                        setSelectedColor(c);
                        setIsEraser(false);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition active:scale-90 ${
                        selectedColor === c && !isEraser
                          ? 'scale-125 border-white shadow-lg'
                          : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {BRUSH_SIZES.map((b) => (
                      <button
                        key={b.size}
                        onClick={() => {
                          sounds.playClick();
                          setSelectedSize(b.size);
                          setIsEraser(false);
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition ${
                          selectedSize === b.size && !isEraser
                            ? 'bg-purple-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setIsEraser(!isEraser);
                    }}
                    className={`p-2 rounded-xl border transition ${
                      isEraser
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleClearCanvas}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" /> Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Live Room Chat Feed & Guesses */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between h-[520px]">
          {/* Top 3 Winners Box */}
          <div className="space-y-2 border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> Correct Guessers ({gameState.correctGuessers.length}/3)
              </span>
            </h3>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-xl">
                <span className="text-amber-400 font-bold block">🥇 1st Place</span>
                <span className="text-white font-mono font-black">+1,000 Pts</span>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-1.5 rounded-xl">
                <span className="text-cyan-400 font-bold block">🥈 2nd Place</span>
                <span className="text-white font-mono font-black">+700 Pts</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 p-1.5 rounded-xl">
                <span className="text-purple-400 font-bold block">🥉 3rd Place</span>
                <span className="text-white font-mono font-black">+500 Pts</span>
              </div>
            </div>
          </div>

          {/* Live Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4 space-y-1">
                <MessageSquare className="w-8 h-8 opacity-30" />
                <p className="text-xs">Chat is live! Type guesses or chat messages below.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentPlayerId;
                const isSystem = m.isSystem || m.senderId === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div
                      key={m.id}
                      className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-purple-500/20 border border-amber-500/40 p-2.5 rounded-xl text-center space-y-0.5 animate-in zoom-in-95 shadow"
                    >
                      <strong className="text-amber-300 font-extrabold text-[11px] block">
                        {m.text}
                      </strong>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{m.senderAvatar}</span>
                      <span className="font-bold text-slate-300">{m.senderName}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat / Guess Input Form */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {hasGuessed ? (
              <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-xs font-bold text-emerald-300 text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>You guessed correctly! Chat is muted for this round.</span>
              </div>
            ) : isDrawer ? (
              <div className="bg-purple-950/60 border border-purple-500/40 p-2.5 rounded-xl text-xs font-bold text-purple-300 text-center">
                🎨 You are the Artist drawing live!
              </div>
            ) : (
              <form onSubmit={handleGuessSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Type word guess or chat message..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!guessInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl transition shadow active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 4. 5-SECOND ROUND SUMMARY OVERLAY ==================== */}
      {gameState.phase === 'ROUND_SUMMARY' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-6 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950 px-3 py-1 rounded-full border border-purple-500/30">
                ROUND {gameState.round} SUMMARY
              </span>
              <h2 className="text-2xl font-black text-white">Secret Word Revealed!</h2>
              <p className="text-3xl font-black text-amber-400 font-mono tracking-wider pt-2">
                "{gameState.currentWord}"
              </p>
              <span className="text-xs text-slate-400 block font-bold">
                Category: {gameState.category}
              </span>
            </div>

            {/* Round Winners Breakdown */}
            <div className="space-y-2 text-left">
              <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">
                Round Winners & Point Rewards
              </h4>

              {gameState.correctGuessers.length === 0 ? (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                  No players guessed correctly this round.
                </div>
              ) : (
                gameState.correctGuessers.map((g) => (
                  <div
                    key={g.playerId}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                      </span>
                      <strong className="text-white">{g.playerName}</strong>
                    </div>
                    <span className="font-mono font-black text-amber-400">
                      +{g.pointsEarned} Pts ({g.timeTakenSeconds}s)
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Next Round Timer Bar */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Starting Next Round Poll...</span>
                <span className="font-mono text-amber-400">{timeLeft}s</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${(timeLeft / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
