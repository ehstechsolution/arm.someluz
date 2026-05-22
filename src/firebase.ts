/**
 * Arthur Luz e Som - Firebase Web SDK (v10) Integration Loader
 * Safely handles and exposes Firebase Authentication and Firestore.
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  getRedirectResult,
  signInWithRedirect
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';

// Default mock configuration or instructions for custom insertion
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC02c5fY-6Vhd4j755w4XqwFmLj00RbeoI",
  authDomain: "backend-arm.firebaseapp.com",
  projectId: "backend-arm",
  storageBucket: "backend-arm.firebasestorage.app",
  messagingSenderId: "692629061781",
  appId: "1:692629061781:web:88c2c86da8925025dcdb9c"
};

// Check if user has stored a custom firebase configuration in localStorage or uses a pre-existing one
const getActiveConfig = () => {
  const customConfig = localStorage.getItem('custom_firebase_config');
  if (customConfig) {
    try {
      return JSON.parse(customConfig);
    } catch {
      return null;
    }
  }
  return null;
};

export const hasRealFirebaseConfig = (): boolean => {
  return getActiveConfig() !== null;
};

// Lazy initialization of Firebase to prevent crashes if credentials are bad
let firebaseApp: any = null;
let firebaseAuth: any = null;

export const initializeFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  const config = getActiveConfig() || DEFAULT_FIREBASE_CONFIG;
  const isDummy = config.apiKey.includes("YourApiKey");
  
  if (isDummy) {
    // Return null or dummy app handle
    return null;
  }

  try {
    firebaseApp = initializeApp(config);
    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase with current config:", error);
    return null;
  }
};

export const getFirebaseAuth = () => {
  if (firebaseAuth) return firebaseAuth;
  const app = initializeFirebaseApp();
  if (app) {
    try {
      firebaseAuth = getAuth(app);
      return firebaseAuth;
    } catch (e) {
      console.warn("Firebase Auth failed to initialze:", e);
    }
  }
  return null;
};

// Lazy initialization of Firestore
let firebaseDb: any = null;

export const getFirebaseDb = () => {
  if (firebaseDb) return firebaseDb;
  const app = initializeFirebaseApp();
  if (app) {
    try {
      firebaseDb = getFirestore(app);
      return firebaseDb;
    } catch (e) {
      console.warn("Firestore failed to initialize:", e);
    }
  }
  return null;
};

// Hardened error handler according to firebase skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Provider helper
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});
export { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, doc, setDoc, getDoc, getDocFromServer };
