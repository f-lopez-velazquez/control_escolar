import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsiJSoSiP8gzdOboIq0e7M_fFVY1UxG3A",
  authDomain: "controlescolar-fb4e6.firebaseapp.com",
  projectId: "controlescolar-fb4e6",
  storageBucket: "controlescolar-fb4e6.firebasestorage.app",
  messagingSenderId: "981505439894",
  appId: "1:981505439894:web:b7aedda2d46568f7d9eab7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, signInWithEmailAndPassword };
