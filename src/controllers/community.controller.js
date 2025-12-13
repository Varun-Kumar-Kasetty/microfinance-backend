const CommunityPost = require("../models/communityPost.model");
const Merchant = require("../models/merchants.model");

// CREATE POST – merchant only
// CREATE POST – merchant only
exports.createPost = async (req, res) => {
  try {
    const { postType, title, description, region } = req.body;

    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const merchant = await Merchant.findOne({ MID });
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    // attachments from uploaded files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => {
        // public path for frontend
        return `/uploads/community/${file.filename}`;
      });
    }

    const post = await CommunityPost.create({
      MID,
      postType: postType || "general",
      title,
      description,
      region,
      attachments,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    console.error("Create Community Post Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
// GET FEED – filters: type, region, search
exports.getFeed = async (req, res) => {
  try {
    const { type, region, search } = req.query;

    const filter = {};
    if (type && type !== "all") {
      filter.postType = type; // fraud | success | general
    }
    if (region) {
      filter.region = region;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const posts = await CommunityPost.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "MID",
        select: "fullName storeName",
        model: "Merchant",
      });

    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error("Get Community Feed Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET SINGLE POST (with merchant info)
exports.getPostByPID = async (req, res) => {
  try {
    const { pid } = req.params;

    const post = await CommunityPost.findOne({ PID: pid }).populate({
      path: "MID",
      select: "fullName storeName",
      model: "Merchant",
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error("Get Community Post Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// LIKE POST (simple counter)
exports.likePost = async (req, res) => {
  try {
    const { pid } = req.params;

    const post = await CommunityPost.findOneAndUpdate(
      { PID: pid },
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Post liked",
      data: post,
    });
  } catch (error) {
    console.error("Like Post Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ADD COMMENT – merchant only
exports.addComment = async (req, res) => {
  try {
    const { pid } = req.params;
    const { text } = req.body;

    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    const post = await CommunityPost.findOne({ PID: pid });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    post.comments.push({ MID, text });
    post.commentsCount = (post.commentsCount || 0) + 1;

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Comment added",
      data: post,
    });
  } catch (error) {
    console.error("Add Comment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE POST (author only)
exports.updatePost = async (req, res) => {
  try {
    const { pid } = req.params;
    const MID = req.merchant?.MID;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const post = await CommunityPost.findOne({ PID: pid });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.MID !== MID) {
      return res.status(403).json({
        success: false,
        message: "You can edit only your own posts",
      });
    }

    const { postType, title, description, region } = req.body;

    if (postType) post.postType = postType;
    if (title) post.title = title;
    if (description) post.description = description;
    if (region !== undefined) post.region = region;

    // if new files uploaded, replace attachments
    if (req.files && req.files.length > 0) {
      post.attachments = req.files.map((file) => {
        return `/uploads/community/${file.filename}`;
      });
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Update Post Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- DELETE POST (author only) -----------------
exports.deletePost = async (req, res) => {
  try {
    const { pid } = req.params;
    const MID = req.merchant?.MID;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const post = await CommunityPost.findOne({ PID: pid });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.MID !== MID) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own posts",
      });
    }

    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- UPDATE COMMENT -----------------
exports.updateComment = async (req, res) => {
  try {
    const { pid, commentId } = req.params;
    const { text } = req.body;
    const MID = req.merchant?.MID;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    const post = await CommunityPost.findOne({ PID: pid });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Author of comment OR owner of post can edit the comment
    if (comment.MID !== MID && post.MID !== MID) {
      return res.status(403).json({
        success: false,
        message: "You cannot edit this comment",
      });
    }

    comment.text = text;
    comment.updatedAt = new Date();

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Update Comment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- DELETE COMMENT -----------------
exports.deleteComment = async (req, res) => {
  try {
    const { pid, commentId } = req.params;
    const MID = req.merchant?.MID;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const post = await CommunityPost.findOne({ PID: pid });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Author of comment OR owner of post can delete the comment
    if (comment.MID !== MID && post.MID !== MID) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this comment",
      });
    }

    comment.remove();
    post.commentsCount = Math.max((post.commentsCount || 1) - 1, 0);

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: post,
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
