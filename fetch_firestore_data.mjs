import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyAPrfR-hG-5CeZiD0EIz_P1r93ywZbxcjc",
  authDomain: "chompchem.firebaseapp.com",
  projectId: "chompchem",
  storageBucket: "chompchem.firebasestorage.app",
  messagingSenderId: "379599502348",
  appId: "1:379599502348:web:d1be32d868ac2a813f0229",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToScan = [
  "scicomm_news",
  "aiuscicomm_news",
  "scicomm_feed_posts",
  "aiuscicomm_feed_posts",
  "scicomm_projects",
  "aiuscicomm_projects",
  "scicomm_gallery",
  "scicomm_events",
  "scicomm_stories",
  "scicommspark_scientists",
  "scicommspark_submissions",
  "scicommspark_ft_places",
  "scicommspark_ft_registrations",
  "scicommspark_timeline_config"
];

async function run() {
  const result = {};
  for (const colName of collectionsToScan) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        result[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${result[colName].length} items from ${colName}`);
      } else {
        console.log(`Collection ${colName} is empty.`);
      }
    } catch (err) {
      console.log(`Error fetching ${colName}:`, err.message);
    }
  }

  const outputPath = path.join(process.cwd(), "extracted_firestore_data.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Saved extracted data to ${outputPath}`);
}

run().catch(console.error);
