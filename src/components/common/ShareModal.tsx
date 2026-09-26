import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  QrCode,
  Smartphone,
  ExternalLink,
  Globe,
  Lock,
  Sparkles,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { getPublicShareUrl, getDevShareUrl, isPrivateDevEnvironment } from '../../services/shareUrl';
import { sounds } from '../../services/sound';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [urlMode, setUrlMode] = useState<'PUBLIC' | 'DEV'>('PUBLIC');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const publicUrl = getPublicShareUrl(roomCode);
  const devUrl = getDevShareUrl(roomCode);
  const activeUrl = urlMode === 'PUBLIC' ? publicUrl : devUrl;
  const isDev = isPrivateDevEnvironment();

  useEffect(() => {
    if (isOpen && activeUrl) {
      QRCode.toDataURL(activeUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#090d16',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopiedLink(true);
    sounds.playClick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    sounds.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border-b border-purple-500/20 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Invite Players & Devices</h3>
              <p className="text-xs text-purple-300">Room Code: {roomCode}</p>
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

        {/* Content */}
        <div className="p-6 space-y-4 text-center max-h-[80vh] overflow-y-auto">
          {/* Explanation Banner regarding 404 / Publishing */}
          {isDev && (
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Why did your phone show "404 Page Not Found"?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                In Google AI Studio, the shared public link (<code className="text-amber-400">ais-pre-...</code>) is deployed <strong>only after you click the "Publish" button</strong> at the top right of Google AI Studio.
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <p>
                  👉 <strong className="text-white">To let anyone join:</strong> Click <strong className="text-amber-400">"Publish"</strong> in Google AI Studio. Once published, anyone scanning the public QR code joins instantly without logging in!
                </p>
                <p>
                  👉 <strong className="text-white">Testing on your own phone now:</strong> Switch below to <strong>"My Own Phone"</strong> (log into Chrome on your phone with your developer account).
                </p>
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold">
            <button
              onClick={() => {
                sounds.playClick();
                setUrlMode('PUBLIC');
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                urlMode === 'PUBLIC'
                  ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> For Friends (Public)
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setUrlMode('DEV');
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                urlMode === 'DEV'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> My Own Phone (Dev)
            </button>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-3 rounded-2xl inline-block shadow-xl border-4 border-slate-800">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for Room ${roomCode}`}
                className="w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-slate-500 text-xs">
                Generating QR Code...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Scan to open room <strong className="text-amber-400 font-mono">{roomCode}</strong> on your phone browser.
          </p>

          {/* Room Code Display Box */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Room Code
              </span>
              <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Share Link Box */}
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{urlMode === 'PUBLIC' ? 'Public Share URL (After Publishing)' : 'Direct Dev URL (For Your Google Account)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow transition shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
