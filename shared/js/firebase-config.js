import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA7HtoKiFqWnopUXOAo4Niz-s17vtihT1Y",
  authDomain:        "bureau-x.firebaseapp.com",
  databaseURL:       "https://bureau-x-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "bureau-x",
  storageBucket:     "bureau-x.firebasestorage.app",
  messagingSenderId: "63256799402",
  appId:             "1:63256799402:web:adfb38bdc32707270888d3",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
