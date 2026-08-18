// Umubavu Protocol — Firebase Shared Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPX4UaLea0ePm8k5rXm3lLX0L0yd2HMzE",
  authDomain: "umubavu-protocol.firebaseapp.com",
  projectId: "umubavu-protocol",
  storageBucket: "umubavu-protocol.firebasestorage.app",
  messagingSenderId: "588449451556",
  appId: "1:588449451556:web:79a4fee472e8e7937452b1",
  measurementId: "G-5ZT2NB278Q"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
