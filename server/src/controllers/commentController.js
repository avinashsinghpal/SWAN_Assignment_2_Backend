const commentService = require('../services/commentService');
const asyncHandler = require('../utils/asyncHandler');

const getComments = asyncHandler(async (req, res) => {
  const comments = await commentService.getComments(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data: { comments }
  });
});

const addComment = asyncHandler(async (req, res) => {
  const comment = await commentService.addComment(req.params.id, req.user._id, req.body.body);
  res.status(201).json({
    success: true,
    data: { comment }
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const result = await commentService.deleteComment(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  getComments,
  addComment,
  deleteComment
};
