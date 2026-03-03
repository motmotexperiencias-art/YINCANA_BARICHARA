// Importar las funciones base de Firebase directamente desde Google (sin instalar nada extra)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Tus "Llaves" mágicas de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNJbh9N3qWQjaSNBuudSYKVwR3EM492OQ",
  authDomain: "yincana-barichara.firebaseapp.com",
  projectId: "yincana-barichara",
  storageBucket: "yincana-barichara.firebasestorage.app",
  messagingSenderId: "1013596720873",
  appId: "1:1013596720873:web:c266b680f856fdf98e6a78",
  measurementId: "G-0KR7492ZF0"
};

// Inicializar la conexión
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar estas herramientas para que los demás archivos (auth.js, motor.js, ranking.html) puedan usarlas
export { db, auth, signInAnonymously, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, query, where };