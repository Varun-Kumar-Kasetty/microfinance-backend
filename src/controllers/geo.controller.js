const Merchant = require("../models/merchants.model");
const Borrower = require("../models/borrower.model");
const CommunityPost = require("../models/communityPost.model");

// helper
function parseLatLng(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude > 90 ||
    latitude < -90 ||
    longitude > 180 ||
    longitude < -180
  ) {
    return null;
  }
  return { latitude, longitude };
}

// ----------------- UPDATE MERCHANT LOCATION -----------------
exports.updateMerchantLocation = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { latitude, longitude, address, city, state, pincode } = req.body;

    const coords = parseLatLng(latitude, longitude);
    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const merchant = await Merchant.findOne({ MID: Number(MID) });

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    merchant.locationGeo = {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    };
    if (address !== undefined) merchant.address = address;
    if (city !== undefined) merchant.city = city;
    if (state !== undefined) merchant.state = state;
    if (pincode !== undefined) merchant.pincode = pincode;

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Merchant location updated",
      data: merchant,
    });
  } catch (error) {
    console.error("Update Merchant Location Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- UPDATE BORROWER LOCATION (BY MERCHANT) -----------------
exports.updateBorrowerLocation = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { bid } = req.params;
    const { latitude, longitude, address, city, state, pincode } = req.body;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const coords = parseLatLng(latitude, longitude);
    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const borrower = await Borrower.findOne({ BID: Number(bid) });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    // borrower must belong to this merchant
    if (borrower.VID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this borrower (not your borrower)",
      });
    }

    borrower.locationGeo = {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    };
    if (address !== undefined) borrower.address = address;
    if (city !== undefined) borrower.city = city;
    if (state !== undefined) borrower.state = state;
    if (pincode !== undefined) borrower.pincode = pincode;

    await borrower.save();

    return res.status(200).json({
      success: true,
      message: "Borrower location updated",
      data: borrower,
    });
  } catch (error) {
    console.error("Update Borrower Location Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- NEARBY BORROWERS FOR MERCHANT -----------------
exports.getNearbyBorrowers = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { lat, lng, radiusKm } = req.query;
    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required",
      });
    }

    const radiusInMeters = Number(radiusKm || 5) * 1000; // default 5km

    const borrowers = await Borrower.find({
      VID: Number(MID),
      locationGeo: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .select("BID fullName phoneNumber locationGeo address city pincode")
      .lean();

    return res.status(200).json({
      success: true,
      data: borrowers,
    });
  } catch (error) {
    console.error("Get Nearby Borrowers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- UPDATE COMMUNITY POST LOCATION -----------------
exports.updateCommunityPostLocation = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { pid } = req.params;
    const { latitude, longitude } = req.body;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const coords = parseLatLng(latitude, longitude);
    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const post = await CommunityPost.findOne({ PID: Number(pid) });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // only owner merchant can update
    if (post.MID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "You can update only your own posts",
      });
    }

    post.locationGeo = {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    };

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Community post location updated",
      data: post,
    });
  } catch (error) {
    console.error("Update Community Post Location Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- NEARBY FRAUD ALERTS -----------------
exports.getNearbyFraudPosts = async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;

    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required",
      });
    }

    const radiusInMeters = Number(radiusKm || 5) * 1000; // default 5km

    const posts = await CommunityPost.find({
      postType: "fraud",
      locationGeo: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Get Nearby Fraud Posts Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
