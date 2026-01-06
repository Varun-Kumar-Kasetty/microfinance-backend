const express = require("express");
const router = express.Router();

const borrowerAuth = require("../middleware/borrowerAuth");
const upload = require("../middleware/uploadBorrowerPhoto");

const {
  getPermanentBorrowerQr,
  generateTemporaryBorrowerQr,
} = require("../controllers/borrowerQr.controller");

const {
  uploadProfilePhoto,
} = require("../controllers/borrowerProfile.controller");

// QR
router.get("/qr/permanent", borrowerAuth, getPermanentBorrowerQr);
router.post("/qr/temporary", borrowerAuth, generateTemporaryBorrowerQr);

// ✅ PROFILE PHOTO UPLOAD
router.post(
  "/profile/photo",
  borrowerAuth,
  upload.single("photo"),
  uploadProfilePhoto
);
console.log("UPLOAD TYPE:", typeof upload);

module.exports = router;
