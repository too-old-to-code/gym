// Public browser app config supplied for gym-dashboard-a8ae3.
// This initializes the Firebase app only. It does not open Realtime Database,
// Auth, Analytics, or Storage, and it does not read or write anything.

const FIREBASE_APP_MODULE = "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEozF0XzSNcJRsKQSqGJkFWd6F6Z05M68",
  authDomain: "gym-dashboard-a8ae3.firebaseapp.com",
  projectId: "gym-dashboard-a8ae3",
  storageBucket: "gym-dashboard-a8ae3.firebasestorage.app",
  messagingSenderId: "58358558669",
  appId: "1:58358558669:web:56318ae4bd96f9d4a75e84",
  databaseURL: "https://gym-dashboard-a8ae3-default-rtdb.europe-west1.firebasedatabase.app",
};

const status = {
  initialized: false,
  realtimeConnected: false,
  databaseConfigured: Boolean(firebaseConfig.databaseURL),
  databaseURL: firebaseConfig.databaseURL,
  projectId: null,
  appName: null,
  error: null,
};

function publish(state) {
  document.documentElement.dataset.firebaseApp = state;
  document.documentElement.dataset.firebaseRealtime = "configured-not-connected";
}

async function startFirebaseApp() {
  try {
    const { initializeApp } = await import(FIREBASE_APP_MODULE);
    const app = initializeApp(firebaseConfig);
    status.initialized = true;
    status.realtimeConnected = false;
    status.databaseConfigured = app.options.databaseURL === firebaseConfig.databaseURL;
    status.databaseURL = app.options.databaseURL;
    status.projectId = app.options.projectId;
    status.appName = app.name;
    publish("initialized");
  } catch (error) {
    status.initialized = false;
    status.realtimeConnected = false;
    status.databaseConfigured = Boolean(firebaseConfig.databaseURL);
    status.error = error && error.message ? String(error.message) : "unavailable";
    publish("unavailable");
  }
}

window.gymFirebase = status;
publish("starting");
startFirebaseApp();
