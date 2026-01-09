const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

console.log("🧪 firebase.js file loaded");

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  try {
    console.log("📂 process.cwd():", process.cwd());

    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      path.join(process.cwd(), "firebase-service-account.json");

    console.log("📄 Looking for service account at:", serviceAccountPath);

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn(
        "❌ Firebase service account file not found at:",
        serviceAccountPath
      );
      return null;
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log("🔥 Firebase Admin initialized successfully");

    return admin;
  } catch (error) {
    console.error("Firebase Admin init error:", error);
    return null;
  }
}

function getFirebaseAdmin() {
  return initFirebase();
}

module.exports = { getFirebaseAdmin };
