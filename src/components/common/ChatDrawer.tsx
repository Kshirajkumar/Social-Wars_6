import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Lock, Users, Smile, ChevronUp } from 'lucide-react';
import { ChatMessage, RoomPlayer } from '../../types/game';
import { socket } from '../../services/socket';
import { sounds } from '../../services/sound';

interface ChatDrawerProps {
  messages: ChatMessage[];
  players: Record<string, RoomPlayer>;
  currentPlayerId: string;
  privateMessagingEnabled: boolean;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '🕵️', '🤫', '💀', '💰', '🤥', '😱', '👑'];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  players,
  currentPlayerId,
  privateMessagingEnabled,
  onSendReaction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [recipientId, setRecipientId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unreadCount = isOpen ? 0 : messages.length;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sounds.playClick();
    socket.sendChat(inputText.trim(), recipientId);
    setInputText('');
  };

  const handleReactionClick = (emoji: string) => {
    sounds.playClick();
    onSendReaction(emoji);
    socket.sendReaction(emoji);
  };

  const otherPlayers = Object.values(players).filter((p) => p.id !== currentPlayerId);

  return (
    <>
      {/* Floating Reaction Bar & Chat Trigger at Bottom */}
      <div className="fixed bottom-3 right-3 sm:right-6 z-40 flex items-center gap-2">
        {/* Quick Reactions Bar */}
        <div className="hidden xs:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1.5 rounded-2xl shadow-xl">
          {QUICK_EMOJIS.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base hover:scale-125 transition-transform active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Toggle Button */}
        <button
          onClick={() => {
            sounds.playClick();
            setIsOpen(!isOpen);
          }}
          className="relative bg-gradient-to-tr from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white p-3 rounded-2xl shadow-lg shadow-purple-500/30 flex items-center gap-2 transition active:scale-95"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline">Room Chat</span>
          {messages.length > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow">
              {Math.min(99, messages.length)}
            </span>
          )}
        </button>
      </div>

      {/* Slide-over or Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-slate-100 text-sm">Room Comms</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {recipientId ? '🔒 Whisper Channel' : '🌐 Public Table'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recipient Channel Selector */}
          {privateMessagingEnabled && otherPlayers.length > 0 && (
            <div className="px-3 py-2 bg-slate-900/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setRecipientId(undefined)}
                className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition ${
                  recipientId === undefined
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🌐 Everyone
              </button>
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRecipientId(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium shrink-0 flex items-center gap-1 transition ${
                    recipientId === p.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Quick Reaction Bar Inside Drawer */}
          <div className="px-3 py-2 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Quick React:</span>
            <div className="flex items-center gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm hover:scale-125 transition active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Smile className="w-10 h-10 opacity-30" />
                <p className="text-xs">No chatter yet. Deceive, negotiate, or share intel with other players!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentPlayerId;
                const isWhisper = Boolean(m.recipientId);

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{m.senderAvatar}</span>
                      <span className="font-semibold text-slate-300">{m.senderName}</span>
                      {isWhisper && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Whisper
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isMe
                          ? isWhisper
                            ? 'bg-amber-600 text-white rounded-br-none shadow-md shadow-amber-600/20'
                            : 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-600/20'
                          : isWhisper
                          ? 'bg-amber-950/80 border border-amber-600/40 text-amber-200 rounded-bl-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                recipientId
                  ? `Whisper to ${players[recipientId]?.name || 'player'}...`
                  : 'Message room...'
              }
              maxLength={250}
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-xl transition shadow active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
