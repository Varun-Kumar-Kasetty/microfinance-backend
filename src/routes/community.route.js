const express = require("express");
const router = express.Router();

const {
  createPost,
  getFeed,
  getPostByPID,
  likePost,
  addComment,
  updatePost,
  deletePost,
  updateComment,
  deleteComment,
} = require("../controllers/community.controller");

const auth = require("../middleware/auth"); // merchant JWT auth
const upload = require("../middleware/upload"); // ⬅ new

// Base: /api/community

// FEED – list posts
router.get("/", getFeed);

// GET SINGLE POST
router.get("/:pid", getPostByPID);

// CREATE POST – merchant only, with image upload (field name: attachments)
router.post("/", auth, upload.array("attachments", 5), createPost);

// UPDATE POST – merchant (author) only, can also upload new images
router.put("/:pid", auth, upload.array("attachments", 5), updatePost);

// DELETE POST – merchant (author) only
router.delete("/:pid", auth, deletePost);

// LIKE POST
router.post("/:pid/like", auth, likePost);

// COMMENTS
router.post("/:pid/comments", auth, addComment);
router.put("/:pid/comments/:commentId", auth, updateComment);
router.delete("/:pid/comments/:commentId", auth, deleteComment);

module.exports = router;
