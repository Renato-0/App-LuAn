// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Substitua pelos seus valores do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDajhJGDuljqcj-hBXldY_A4EH0A9slL5U",
  authDomain: "app-luan-f3ec0.firebaseapp.com",
  projectId: "app-luan-f3ec0",
  storageBucket: "app-luan-f3ec0.firebasestorage.app",
  messagingSenderId: "204773100642",
  appId: "1:204773100642:web:d18d78408c979c1afd153b"
};



// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);
const auth = getAuth(app)
// Exportar a instância do Firestore
export { db };
export {auth};