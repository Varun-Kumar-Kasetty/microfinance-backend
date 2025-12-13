const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let appInitialized = false;

function initFirebase() {
  if (appInitialized) return;

  try {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT || "./firebase-service-account.json";

    const absolutePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(__dirname, "..", serviceAccountPath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(
        "Firebase service account file not found at:",
        absolutePath
      );
      return;
    }

    const serviceAccount = require(absolutePath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    appInitialized = true;
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Firebase Admin init error:", error);
  }
}

function getFirebaseAdmin() {
  initFirebase();
  return admin;
}

module.exports = { getFirebaseAdmin };
