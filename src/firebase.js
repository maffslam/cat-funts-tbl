// ============================================================
// Firebase Configuration & Helpers
// ============================================================
// Copy .env.example to .env and fill in your Firebase config.
// Create a Firebase project at https://console.firebase.google.com
// Enable: Firestore Database, Authentication (Phone + Google)
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// ---- FIREBASE INIT ----

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ---- AUTH HELPERS ----

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const setupRecaptcha = (elementId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: "invisible",
    });
  }
  return window.recaptchaVerifier;
};

export const signInWithPhone = async (phoneNumber, elementId) => {
  const verifier = setupRecaptcha(elementId);
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmation;
};

export const logOut = () => signOut(auth);

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// ---- FIRESTORE HELPERS ----

// Users (top-level collection mapping auth UID → competition)
export const getUserCompetition = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().competitionId : null;
};

export const setUserCompetition = async (uid, competitionId) => {
  await setDoc(doc(db, "users", uid), { competitionId, updatedAt: serverTimestamp() }, { merge: true });
};

// Competition
export const getCompetition = async (compId) => {
  const snap = await getDoc(doc(db, "competitions", compId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getCompetitionByCode = async (code) => {
  const q = query(
    collection(db, "competitions"),
    where("code", "==", code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const createCompetition = async (data) => {
  const ref = await addDoc(collection(db, "competitions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateCompetition = async (compId, data) => {
  await updateDoc(doc(db, "competitions", compId), data);
};

// Players
export const getPlayers = async (compId) => {
  const snap = await getDocs(
    collection(db, "competitions", compId, "players")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPlayer = async (compId, playerId) => {
  const snap = await getDoc(
    doc(db, "competitions", compId, "players", playerId)
  );
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getPlayerByAuthUid = async (compId, authUid) => {
  const q = query(
    collection(db, "competitions", compId, "players"),
    where("authUid", "==", authUid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const createPlayer = async (compId, playerId, data) => {
  await setDoc(doc(db, "competitions", compId, "players", playerId), {
    ...data,
    joinedAt: serverTimestamp(),
  });
};

export const updatePlayer = async (compId, playerId, data) => {
  await updateDoc(doc(db, "competitions", compId, "players", playerId), data);
};

// Weigh-ins
export const getWeighins = async (compId) => {
  const snap = await getDocs(
    query(
      collection(db, "competitions", compId, "weighins"),
      orderBy("date", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPlayerWeighins = async (compId, playerId) => {
  const q = query(
    collection(db, "competitions", compId, "weighins"),
    where("playerId", "==", playerId),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addWeighin = async (compId, data) => {
  const ref = await addDoc(
    collection(db, "competitions", compId, "weighins"),
    {
      ...data,
      date: serverTimestamp(),
    }
  );
  return ref.id;
};

export const updateWeighin = async (compId, weighinId, data) => {
  await updateDoc(
    doc(db, "competitions", compId, "weighins", weighinId),
    data
  );
};

export const deleteWeighin = async (compId, weighinId) => {
  await deleteDoc(doc(db, "competitions", compId, "weighins", weighinId));
};

// Sprint Results
export const getSprintResults = async (compId) => {
  const snap = await getDocs(
    collection(db, "competitions", compId, "sprintResults")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const setSprintResult = async (compId, sprintNumber, data) => {
  await setDoc(
    doc(db, "competitions", compId, "sprintResults", String(sprintNumber)),
    { ...data, announcedAt: serverTimestamp() }
  );
};

// ---- REAL-TIME LISTENERS ----

export const listenToPlayers = (compId, callback) => {
  return onSnapshot(
    collection(db, "competitions", compId, "players"),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
};

export const listenToWeighins = (compId, callback) => {
  return onSnapshot(
    query(
      collection(db, "competitions", compId, "weighins"),
      orderBy("date", "asc")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
};

export const listenToCompetition = (compId, callback) => {
  return onSnapshot(doc(db, "competitions", compId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
};

// ---- TIMESTAMP HELPERS ----

export const toTimestamp = (date) => Timestamp.fromDate(new Date(date));
export const fromTimestamp = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};
export { serverTimestamp, Timestamp };
