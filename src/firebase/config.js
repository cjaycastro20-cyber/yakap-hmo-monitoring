import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBqrp5SBG0K_a2zR04uiXQy8bZNf7kGc_Y",
  authDomain: "yakap-monitoring.firebaseapp.com",
  projectId: "yakap-monitoring",
  storageBucket: "yakap-monitoring.firebasestorage.app",
  messagingSenderId: "86154779926",
  appId: "1:86154779926:web:351b90798f07f2d1184437",
};

const app = initializeApp(firebaseConfig);

export default app;