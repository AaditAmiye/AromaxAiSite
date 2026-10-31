import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const realApiKey = 'AIzaSyBtmBnzYjhTLqaj3A-QWnpcyFy82kgGOcg';
const realDbUrl = 'https://aromaxaitest-default-rtdb.asia-southeast1.firebasedatabase.app';
const realProjectId = 'aromaxaitest-default-rtdb';

const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const envDbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;

const firebaseConfig: Partial<FirebaseConfig> = {
  apiKey: envApiKey && !envApiKey.includes('ABC123') ? envApiKey : realApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aromaxaitest-default-rtdb.firebaseapp.com',
  databaseURL: envDbUrl && !envDbUrl.includes('aromaxai-123') ? envDbUrl : realDbUrl,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID && !import.meta.env.VITE_FIREBASE_PROJECT_ID.includes('aromaxai-123') ? import.meta.env.VITE_FIREBASE_PROJECT_ID : realProjectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  (firebaseConfig.projectId || firebaseConfig.databaseURL)
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    if (firebaseConfig.databaseURL) {
      db = getDatabase(app);
    }
  } catch (err) {
    console.warn('[AROMAXAI Firebase] Initialization notice:', err);
  }
}

export { app, auth, db };
