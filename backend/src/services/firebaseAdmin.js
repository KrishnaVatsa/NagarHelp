import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback if the user puts the JSON file in the backend root
    const credentialPath = path.resolve(__dirname, '../../google-credentials.json');
    if (fs.existsSync(credentialPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    }
  }
} catch (error) {
  console.error("Failed to load Firebase Service Account:", error.message);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export const db = admin.firestore();
export const rtdb = admin.database();
export const auth = admin.auth();
export const storage = admin.storage();
