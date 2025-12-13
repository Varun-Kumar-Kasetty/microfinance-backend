const express = require("express");
const router = express.Router();

const {
  updateMerchantLocation,
  updateBorrowerLocation,
  getNearbyBorrowers,
  updateCommunityPostLocation,
  getNearbyFraudPosts,
} = require("../controllers/geo.controller");

const auth = require("../middleware/auth"); // merchant JWT

// Base: /api/geo

// MERCHANT: update own location
router.put("/merchant/location", auth, updateMerchantLocation);

// MERCHANT: update a borrower's location
router.put("/borrower/:bid/location", auth, updateBorrowerLocation);

// MERCHANT: find nearby borrowers
// GET /api/geo/borrowers/nearby?lat=..&lng=..&radiusKm=5
router.get("/borrowers/nearby", auth, getNearbyBorrowers);

// MERCHANT: geo-tag a community post (fraud/general)
router.put("/community/:pid/location", auth, updateCommunityPostLocation);

// ANY: get nearby fraud posts
// GET /api/geo/community/fraud/nearby?lat=..&lng=..&radiusKm=5
router.get("/community/fraud/nearby", getNearbyFraudPosts);

module.exports = router;
