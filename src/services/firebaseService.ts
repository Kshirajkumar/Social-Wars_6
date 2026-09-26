import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { RoomState, ChatMessage } from '../types/game';

// Initialize Firebase App
const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      });

// Initialize Firestore with custom database ID if specified
export const db = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId || '(default)'
);
export const auth = getAuth(firebaseApp);

let currentUser: User | null = null;

// Authenticate anonymously
signInAnonymously(auth).catch((err) => {
  console.warn('[Firebase] Anonymous sign in fallback:', err.message);
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log('[Firebase] User authenticated:', user.uid);
  }
});

export const firebaseService = {
  getUid(): string {
    return currentUser?.uid || auth.currentUser?.uid || 'anon_' + Date.now();
  },

  /**
   * Save or update full RoomState in Firestore for cross-device real-time sync
   */
  async saveRoom(room: RoomState): Promise<void> {
    if (!room || !room.roomCode) return;
    try {
      const roomRef = doc(db, 'rooms', room.roomCode.toUpperCase().trim());
      const cleanRoom = JSON.parse(JSON.stringify(room));
      cleanRoom.lastUpdated = Date.now();
      await setDoc(roomRef, cleanRoom, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Error saving room to Firestore:', err);
    }
  },

  /**
   * Real-time subscription to room changes in Firestore
   */
  subscribeRoom(roomCode: string, onUpdate: (room: RoomState) => void): Unsubscribe {
    const code = roomCode.toUpperCase().trim();
    const roomRef = doc(db, 'rooms', code);

    return onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as RoomState;
          if (data && data.roomCode === code) {
            onUpdate(data);
          }
        }
      },
      (error) => {
        console.warn('[Firebase] Room snapshot error:', error);
      }
    );
  },

  /**
   * Get single room snapshot from Firestore
   */
  async fetchRoom(roomCode: string): Promise<RoomState | null> {
    try {
      const code = roomCode.toUpperCase().trim();
      const roomRef = doc(db, 'rooms', code);
      const snapshot = await getDoc(roomRef);
      if (snapshot.exists()) {
        return snapshot.data() as RoomState;
      }
    } catch (err) {
      console.warn('[Firebase] Error fetching room:', err);
    }
    return null;
  },

  /**
   * Append chat message directly in Firestore
   */
  async sendChat(roomCode: string, message: ChatMessage): Promise<void> {
    try {
      const code = roomCode.toUpperCase().trim();
      const roomRef = doc(db, 'rooms', code);
      await updateDoc(roomRef, {
        chats: arrayUnion(message),
        lastUpdated: Date.now(),
      });
    } catch (err) {
      console.warn('[Firebase] Error sending chat to Firestore:', err);
    }
  },

  /**
   * Persist User Wallet Balance
   */
  async saveUserWallet(playerId: string, balance: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', playerId);
      await setDoc(userRef, { uid: playerId, walletBalance: balance, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Error saving user wallet:', err);
    }
  },

  /**
   * Fetch User Wallet Balance
   */
  async getUserWallet(playerId: string): Promise<number | null> {
    try {
      const userRef = doc(db, 'users', playerId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        return snapshot.data()?.walletBalance ?? null;
      }
    } catch (err) {
      console.warn('[Firebase] Error getting user wallet:', err);
    }
    return null;
  },
};
