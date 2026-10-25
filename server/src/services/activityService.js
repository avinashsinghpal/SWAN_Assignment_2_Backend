const Activity = require('../models/Activity');
const Task = require('../models/Task');

class ActivityService {
  async logActivity({ task, taskTitle, actor, type, meta = {} }) {
    try {
      const activity = await Activity.create({
        task: task ? task._id || task : null,
        taskTitle: taskTitle || (task && task.title) || 'Unknown task',
        actor: actor._id || actor,
        type,
        meta
      });
      return activity;
    } catch (err) {
      // Don't fail the primary operation if logging fails
      console.error('Failed to log activity:', err.message);
    }
  }

  async getTaskActivity(taskId) {
    return Activity.find({ task: taskId })
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async getGlobalActivity({ user, type, page = 1, limit = 30 }) {
    const filter = {};

    if (type) {
      filter.type = type;
    }

    // Role scoping: if user is not admin, only show activities for tasks they created or are assigned to
    if (user.role !== 'admin') {
      const accessibleTasks = await Task.find({
        $or: [{ createdBy: user._id }, { assignee: user._id }]
      }).select('_id');
      const taskIds = accessibleTasks.map((t) => t._id);

      filter.$or = [
        { task: { $in: taskIds } },
        { actor: user._id }
      ];
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('actor', 'name email role')
        .populate('task', 'title status priority')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(filter)
    ]);

    return {
      activities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new ActivityService();
