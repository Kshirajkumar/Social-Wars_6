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
  Brush,
  Eye,
  Award,
  HelpCircle,
} from 'lucide-react';
import { DrawAndGuessGameState, RoomPlayer, DrawingStroke } from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';
import { GameStepGuide } from '../common/GameStepGuide';

interface DrawAndGuessGameProps {
  gameState: DrawAndGuessGameState;
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  isHost: boolean;
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
  onOpenHintModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    if (!isDrawer) return;
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentStroke([coords]);
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentStroke((prev) => [...prev, coords]);
  };

  const handleEndDraw = () => {
    if (!isDrawer || !isDrawing) return;
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
    if (!isDrawer) return;
    sounds.playClick();
    socket.sendGameAction('DRAW_AND_GUESS', 'CLEAR_CANVAS');
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isDrawer || hasGuessed) return;
    sounds.playClick();
    socket.sendChat(guessInput.trim());
    setGuessInput('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16">
      {/* Interactive Step Guide Banner */}
      <GameStepGuide gameType="DRAW_AND_GUESS" phase={gameState.phase} />

      {/* Top Bar: Round Indicator, Timer & Category */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Round & Phase */}
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
            {isDrawer ? '🎨 You are the Artist! Draw the word below.' : `🔎 ${drawerPlayer?.name || 'Artist'} is drawing. Guess the word in chat!`}
          </p>
        </div>

        {/* Autoritative Timer */}
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

        {/* Active Player Score */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block">Your Score</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              🏆 {(players[currentPlayerId]?.score || 0).toLocaleString()} Pts
            </span>
          </div>
        </div>
      </div>

      {/* Word / Masked Hint Header Banner */}
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
              Draw this word on the canvas below. Do not type letters in drawing!
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
                <CheckCircle2 className="w-4 h-4" /> You Guessed It Correctly!
              </span>
            ) : (
              <p className="text-xs text-slate-400">
                Type your guess in the chat box on the right. First 3 correct guessers win top points!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Drawing Grid: Canvas Board (8 Cols) & Guess Feed (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Canvas Area (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 flex flex-col justify-between">
          {/* Canvas Wrapper */}
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
              className={`w-full h-full block touch-none ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
            />

            {/* Non-drawer Artist Badge Overlay */}
            {!isDrawer && (
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-200 shadow">
                <span className="text-lg">{drawerPlayer?.avatar || '🎨'}</span>
                <span>{drawerPlayer?.name || 'Artist'} is drawing live...</span>
              </div>
            )}
          </div>

          {/* Artist Drawing Tools Toolbar (Only visible to Drawer) */}
          {isDrawer && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Palette */}
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

                {/* Brush Thickness & Tools */}
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

        {/* Sidebar: Top 3 Guesser Winners & Chat Guess Input (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          {/* Top 3 Guessers Podium Box */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Trophy className="w-4 h-4 text-amber-400" /> Round Winners
            </h3>

            <div className="space-y-2">
              {gameState.correctGuessers.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                  <Sparkles className="w-5 h-5 mx-auto opacity-30" />
                  <p>No correct guesses yet. Type your guess below!</p>
                </div>
              ) : (
                gameState.correctGuessers.map((g) => (
                  <div
                    key={g.playerId}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs animate-in zoom-in-95 ${
                      g.rank === 1
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : g.rank === 2
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                      </span>
                      <div>
                        <strong className="text-white block">{g.playerName}</strong>
                        <span className="text-[10px] opacity-80">
                          {g.timeTakenSeconds}s • #{g.rank} Guesser
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm">+{g.pointsEarned} Pts</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guess Chat Input Box */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">
              {isDrawer
                ? '🎨 You are drawing (Chat disabled for artist)'
                : hasGuessed
                ? '✓ You guessed correctly! Watch others try.'
                : '💬 Type your word guess:'}
            </span>

            <form onSubmit={handleGuessSubmit} className="flex gap-2">
              <input
                type="text"
                disabled={isDrawer || hasGuessed}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={isDrawer ? 'Artist drawing...' : hasGuessed ? 'Guessed correctly!' : 'Type secret word guess...'}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!guessInput.trim() || isDrawer || hasGuessed}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl transition shadow active:scale-95 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Guess
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
