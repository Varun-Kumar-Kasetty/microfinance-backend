// src/routes/merchant.routes.js
const express = require("express");
const router = express.Router();

const {
  createMerchant,
  getAllMerchants,
  getMerchantByMID,
  updateMerchantByMID,
  deleteMerchantByMID,
  getMerchantProfile,
} = require("../controllers/merchant.controller");

// Base path: /api/merchants

// CREATE
router.post("/", createMerchant);

// READ ALL
router.get("/", getAllMerchants);

// READ ONE by MID
router.get("/:mid", getMerchantByMID);

// PROFILE (merchant + loans)
router.get("/:mid/profile", getMerchantProfile);

// UPDATE by MID
router.put("/:mid", updateMerchantByMID);

// DELETE by MID
router.delete("/:mid", deleteMerchantByMID);

module.exports = router;
