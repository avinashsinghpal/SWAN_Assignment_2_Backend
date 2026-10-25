const Comment = require('../models/Comment');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const activityService = require('./activityService');

class CommentService {
  async assertTaskAccess(taskId, user) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (
      user.role !== 'admin' &&
      task.createdBy.toString() !== user._id.toString() &&
      task.assignee?.toString() !== user._id.toString()
    ) {
      // Return 404 to avoid leaking existence of private tasks
      throw ApiError.notFound('Task not found');
    }

    return task;
  }

  async getComments(taskId, user) {
    await this.assertTaskAccess(taskId, user);

    return Comment.find({ task: taskId })
      .populate('author', 'name email role')
      .sort({ createdAt: 1 });
  }

  async addComment(taskId, authorId, body) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const comment = await Comment.create({
      task: taskId,
      author: authorId,
      body
    });

    await comment.populate('author', 'name email role');

    await activityService.logActivity({
      task,
      taskTitle: task.title,
      actor: authorId,
      type: 'comment_added',
      meta: {
        commentId: comment._id,
        preview: body.length > 60 ? `${body.substring(0, 60)}...` : body
      }
    });

    return comment;
  }

  async deleteComment(commentId, user) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    // Role check: Author can delete own comment, Admin can delete any
    if (user.role !== 'admin' && comment.author.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    await comment.deleteOne();
    return { message: 'Comment deleted successfully' };
  }
}

module.exports = new CommentService();
