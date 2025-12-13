// src/routes/aadhaarFree.routes.js
const express = require("express");
const multer = require("multer");
const upload = multer(); // in-memory
const router = express.Router();
const { decodeAadhaarQr } = require("../controllers/aadhaarFree.controller");

router.post("/decode-qr", upload.single("image"), decodeAadhaarQr);

module.exports = router;
