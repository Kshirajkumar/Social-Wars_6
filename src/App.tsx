import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { Lobby } from './components/Lobby';
import { BluffCityGame } from './components/bluff-city/BluffCityGame';
import { MurderMysteryGame } from './components/murder-mystery/MurderMysteryGame';
import { SecretAuctionGame } from './components/secret-auction/SecretAuctionGame';
import { PostGameScreen } from './components/common/PostGameScreen';
import { HintModal } from './components/common/HintModal';
import { ChatDrawer } from './components/common/ChatDrawer';
import { ProfileModal } from './components/common/ProfileModal';
import { LeaderboardModal } from './components/common/LeaderboardModal';
import { AchievementsModal } from './components/common/AchievementsModal';
import { CosmeticsModal } from './components/common/CosmeticsModal';
import { RulesGuideModal } from './components/common/RulesGuideModal';
import { ShareModal } from './components/common/ShareModal';
import { RoomState, ChatMessage } from './types/game';
import { CosmeticItem } from './data/constants';
import { socket } from './services/socket';
import { sounds } from './services/sound';

interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  x: number;
}

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(10000);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [currentHintText, setCurrentHintText] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Profile preferences
  const [avatar, setAvatar] = useState('🐺');
  const [title, setTitle] = useState('Rookie Tactician');
  const [badgeFrame, setBadgeFrame] = useState('border-slate-700');
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<string[]>(['av_wolf', 'title_novice', 'frame_default']);
  const [xp, setXp] = useState(1450);

  useEffect(() => {
    // Establish WebSocket Connection
    socket.connect();

    const unsubRoomJoined = socket.on('ROOM_JOINED', (data) => {
      setRoom(data.room);
      setCurrentPlayerId(data.playerId);
      setWalletBalance(data.walletBalance);
      setToastMessage(`Connected to Room ${data.roomCode}`);
      setTimeout(() => setToastMessage(null), 3000);
    });

    const unsubRoomUpdate = socket.on('ROOM_UPDATE', (data) => {
      setRoom(data.room);
    });

    const unsubChatMessage = socket.on('CHAT_MESSAGE', (data) => {
      setChatMessages((prev) => [...prev, data.message]);
    });

    const unsubFloatingReaction = socket.on('ROOM_UPDATE', (data) => {
      if (data.event?.type === 'FLOATING_REACTION') {
        const id = `react_${Date.now()}_${Math.random()}`;
        const newReaction: FloatingReaction = {
          id,
          emoji: data.event.emoji,
          senderName: data.event.senderName,
          x: Math.floor(20 + Math.random() * 60),
        };
        setFloatingReactions((prev) => [...prev, newReaction]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2500);
      }
    });

    const unsubHintDelivered = socket.on('HINT_DELIVERED', (data) => {
      sounds.playClueFound();
      setCurrentHintText(data.hintText);
      setWalletBalance(data.newWalletBalance);
      setShowHintModal(true);
    });

    const unsubError = socket.on('ERROR', (data) => {
      sounds.playBuzzer();
      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 4000);
    });

    return () => {
      unsubRoomJoined();
      unsubRoomUpdate();
      unsubChatMessage();
      unsubFloatingReaction();
      unsubHintDelivered();
      unsubError();
    };
  }, []);

  const handleSendReaction = (emoji: string) => {
    const id = `react_${Date.now()}_${Math.random()}`;
    const newReaction: FloatingReaction = {
      id,
      emoji,
      senderName: room?.players[currentPlayerId]?.name || 'Me',
      x: Math.floor(30 + Math.random() * 40),
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  const handleEquipCosmetic = (type: 'AVATAR' | 'TITLE' | 'FRAME' | 'THEME', value: string) => {
    if (type === 'AVATAR') setAvatar(value);
    else if (type === 'TITLE') setTitle(value);
    else if (type === 'FRAME') setBadgeFrame(value);
  };

  const handlePurchaseCosmetic = (item: CosmeticItem) => {
    if (walletBalance >= item.cost) {
      setWalletBalance((prev) => prev - item.cost);
      setUnlockedCosmetics((prev) => [...prev, item.id]);
      handleEquipCosmetic(item.type, item.preview);
      sounds.playVictory();
    }
  };

  const isHost = room ? room.hostId === currentPlayerId : false;
  const me = room?.players[currentPlayerId];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/50 text-amber-300 text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Floating Reactions overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 flex flex-col items-center animate-out fade-out slide-out-to-top duration-1000"
            style={{ left: `${r.x}%`, animationDuration: '2.5s' }}
          >
            <span className="text-4xl filter drop-shadow-lg">{r.emoji}</span>
            <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded-full border border-slate-700 shadow">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Navbar */}
      <Navbar
        room={room}
        walletBalance={walletBalance}
        onOpenProfile={() => setShowProfile(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenAchievements={() => setShowAchievements(true)}
        onOpenCosmetics={() => setShowCosmetics(true)}
        onOpenRules={() => setShowRules(true)}
        onOpenShare={() => setShowShareModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {!room ? (
          <HomeScreen
            onOpenRules={() => setShowRules(true)}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
          />
        ) : room.phase === 'LOBBY' ? (
          <Lobby
            room={room}
            currentPlayerId={currentPlayerId}
            isHost={isHost}
            onOpenRules={() => setShowRules(true)}
          />
        ) : room.phase === 'POST_GAME' && room.postGameSummary ? (
          <PostGameScreen
            summary={room.postGameSummary}
            currentPlayerId={currentPlayerId}
            isHost={isHost}
            onReturnToLobby={() => socket.rematch()}
          />
        ) : (
          /* Active Playing Phase */
          <div className="flex-1">
            {room.settings.selectedGame === 'BLUFF_CITY' && room.bluffCityState && (
              <BluffCityGame
                gameState={room.bluffCityState}
                players={room.players}
                currentPlayerId={currentPlayerId}
                isHost={isHost}
                onOpenHintModal={() => setShowHintModal(true)}
              />
            )}

            {room.settings.selectedGame === 'MURDER_MYSTERY' && room.murderMysteryState && (
              <MurderMysteryGame
                gameState={room.murderMysteryState}
                players={room.players}
                currentPlayerId={currentPlayerId}
                isHost={isHost}
                onOpenHintModal={() => setShowHintModal(true)}
              />
            )}

            {room.settings.selectedGame === 'SECRET_AUCTION' && room.secretAuctionState && (
              <SecretAuctionGame
                gameState={room.secretAuctionState}
                players={room.players}
                currentPlayerId={currentPlayerId}
                isHost={isHost}
                onOpenHintModal={() => setShowHintModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* In-Game Room Comms Drawer */}
      {room && (
        <ChatDrawer
          messages={chatMessages}
          players={room.players}
          currentPlayerId={currentPlayerId}
          privateMessagingEnabled={room.settings.privateMessagingEnabled}
          onSendReaction={handleSendReaction}
        />
      )}

      {/* Hint Modal */}
      <HintModal
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        walletBalance={walletBalance}
        currentHintText={currentHintText}
        gameTitle={
          room?.settings.selectedGame === 'BLUFF_CITY'
            ? 'Bluff City Investigation'
            : room?.settings.selectedGame === 'MURDER_MYSTERY'
            ? 'Blackwood Manor Forensic Inquest'
            : 'Secret Auction Due Diligence'
        }
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        playerName={me?.name || 'Agent'}
        avatar={me?.avatar || avatar}
        title={me?.title || title}
        badgeFrame={me?.badgeFrame || badgeFrame}
        walletBalance={walletBalance}
        xp={xp}
        level={Math.floor(xp / 1000) + 1}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
      />

      {/* Cosmetics Modal */}
      <CosmeticsModal
        isOpen={showCosmetics}
        onClose={() => setShowCosmetics(false)}
        walletBalance={walletBalance}
        currentAvatar={avatar}
        currentTitle={title}
        currentFrame={badgeFrame}
        unlockedItemIds={unlockedCosmetics}
        onEquip={handleEquipCosmetic}
        onPurchase={handlePurchaseCosmetic}
      />

      {/* Rules Guide Modal */}
      <RulesGuideModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        defaultGame={room?.settings.selectedGame || 'BLUFF_CITY'}
      />

      {/* Share & Mobile QR Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomCode={room?.roomCode || ''}
      />
    </div>
  );
}
