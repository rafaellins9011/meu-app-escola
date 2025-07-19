// src/firebaseConfig.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- ADICIONADO

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDacbKVEcFR22ByOttvZ74tL2DZIzhETHI", // Seus valores reais
  authDomain: "gestaomilitar.firebaseapp.com",
  projectId: "gestaomilitar",
  storageBucket: "gestaomilitar.appspot.com", // CORRIGIDO: Geralmente termina com .appspot.com
  messagingSenderId: "488871562917",
  appId: "1:488871562917:web:c736254db8d379f3ea874c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicialize os serviços que você vai usar
const db = getFirestore(app);
const storage = getStorage(app); // <-- ADICIONADO

// Exporte os serviços para serem usados em outros arquivos
export { db, storage }; // <-- ADICIONADO