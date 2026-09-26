import React, { useState } from 'react';
import { X, ShoppingBag, Coins, Check, Sparkles } from 'lucide-react';
import { COSMETIC_ITEMS, CosmeticItem } from '../../data/constants';
import { sounds } from '../../services/sound';

interface CosmeticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  currentAvatar: string;
  currentTitle: string;
  currentFrame?: string;
  unlockedItemIds: string[];
  onEquip: (type: 'AVATAR' | 'TITLE' | 'FRAME' | 'THEME', value: string) => void;
  onPurchase: (item: CosmeticItem) => void;
}

export const CosmeticsModal: React.FC<CosmeticsModalProps> = ({
  isOpen,
  onClose,
  walletBalance,
  currentAvatar,
  currentTitle,
  currentFrame,
  unlockedItemIds,
  onEquip,
  onPurchase,
}) => {
  const [activeTab, setActiveTab] = useState<'AVATAR' | 'TITLE' | 'FRAME'>('AVATAR');

  if (!isOpen) return null;

  const items = COSMETIC_ITEMS.filter((i) => i.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-b border-emerald-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Cosmetics Emporium</h3>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5" /> {walletBalance.toLocaleString()} Social Coins
              </div>
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex items-center gap-2 text-xs">
          {[
            { id: 'AVATAR', label: '🎭 Avatars' },
            { id: 'TITLE', label: '📜 Titles' },
            { id: 'FRAME', label: '🖼️ Player Frames' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const isUnlocked = item.cost === 0 || unlockedItemIds.includes(item.id);
            const isEquipped =
              (item.type === 'AVATAR' && currentAvatar === item.preview) ||
              (item.type === 'TITLE' && currentTitle === item.preview) ||
              (item.type === 'FRAME' && currentFrame === item.preview);

            return (
              <div
                key={item.id}
                className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-2xl border border-slate-700/80">
                    {item.type === 'AVATAR' ? (
                      item.preview
                    ) : item.type === 'FRAME' ? (
                      <div className={`w-8 h-8 rounded-lg border-2 ${item.preview} bg-slate-700`} />
                    ) : (
                      '🏷️'
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 leading-tight">{item.description}</p>
                    {item.cost > 0 && !isUnlocked && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 mt-1">
                        <Coins className="w-3 h-3" /> {item.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {isEquipped ? (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3" /> Equipped
                    </span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onEquip(item.type, item.preview);
                      }}
                      className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition active:scale-95"
                    >
                      Equip
                    </button>
                  ) : (
                    <button
                      disabled={walletBalance < item.cost}
                      onClick={() => {
                        sounds.playClick();
                        onPurchase(item);
                      }}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg shadow-md shadow-emerald-600/20 transition active:scale-95"
                    >
                      Unlock
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-950 border-t border-slate-800 p-3 text-center text-[11px] text-slate-400">
          ✨ Fair Play Guarantee: Cosmetics are strictly visual and do NOT alter gameplay odds or statistics.
        </div>
      </div>
    </div>
  );
};
