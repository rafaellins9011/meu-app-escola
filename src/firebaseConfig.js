// src/firebaseConfig.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// NOVIDADE: Importe a função para obter o serviço Firestore
import { getFirestore } from "firebase/firestore"; // <-- ESTA LINHA É NECESSÁRIA

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDacbKVEcFR22ByOttvZ74tL2DZIzhETHI", // Seus valores reais
  authDomain: "gestaomilitar.firebaseapp.com",
  projectId: "gestaomilitar",
  storageBucket: "gestaomilitar.firebasestorage.app",
  messagingSenderId: "488871562917",
  appId: "1:488871562917:web:c736254db8d379f3ea874c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// NOVIDADE: Inicialize o Cloud Firestore e o exporte
export const db = getFirestore(app); // <-- ESTA LINHA É NECESSÁRIA PARA USAR 'db' NO Painel.js