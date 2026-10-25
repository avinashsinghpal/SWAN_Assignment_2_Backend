const mongoose = require('mongoose');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const activityService = require('./activityService');
const { getStartOfToday } = require('../utils/dates');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

class TaskService {
  /**
   * Build MongoDB query filter based on role and request query parameters
   */
  buildFilter(user, query) {
    const filter = {};

    // 1. RBAC Scoping: Admin sees all; regular user sees only tasks they created or are assigned to
    if (user.role !== 'admin') {
      filter.$or = [
        { createdBy: user._id },
        { assignee: user._id }
      ];
    }

    // 2. Search by title (case-insensitive, regex-escaped)
    if (query.search && query.search.trim()) {
      filter.title = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
    }

    // 3. Status filter (supports comma-separated list like 'todo,in_progress')
    if (query.status) {
      const statuses = query.status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    // 4. Priority filter (supports comma-separated list like 'high,medium')
    if (query.priority) {
      const priorities = query.priority.split(',').map((p) => p.trim()).filter(Boolean);
      if (priorities.length === 1) {
        filter.priority = priorities[0];
      } else if (priorities.length > 1) {
        filter.priority = { $in: priorities };
      }
    }

    // 5. Assignee filter
    if (query.assignee) {
      if (query.assignee === 'unassigned') {
        filter.assignee = null;
      } else if (mongoose.Types.ObjectId.isValid(query.assignee)) {
        filter.assignee = new mongoose.Types.ObjectId(query.assignee);
      }
    }

    // 6. Overdue only filter
    if (query.overdue === true || query.overdue === 'true') {
      const startOfToday = getStartOfToday();
      filter.dueDate = { $lt: startOfToday, $ne: null };
      filter.status = { $ne: 'completed' };
    }

    return filter;
  }

  async createTask(data, user) {
    let assigneeId = data.assignee || null;
    if (assigneeId === undefined || assigneeId === '') {
      // Default to self if not explicitly provided
      assigneeId = user._id;
    }

    // Role-based restriction: Only admin can assign tasks to other users; normal users can only assign to themselves.
    if (user.role !== 'admin') {
      if (assigneeId && assigneeId.toString() !== user._id.toString()) {
        throw ApiError.forbidden('Only administrators can assign tasks to other team members');
      }
      if (!assigneeId) {
        assigneeId = user._id;
      }
    }

    // If assignee specified, verify assignee exists and is active
    if (assigneeId) {
      const assigneeUser = await User.findById(assigneeId);
      if (!assigneeUser || !assigneeUser.isActive) {
        throw ApiError.badRequest('Assignee not found or inactive');
      }
    }

    // Compute initial order for column if not provided
    let order = data.order !== undefined ? data.order : 0;
    if (data.order === undefined) {
      const highestTask = await Task.findOne({ status: data.status || 'todo' })
        .sort({ order: -1 })
        .select('order');
      order = highestTask && highestTask.order !== undefined ? highestTask.order + 1000 : 1000;
    }

    const task = await Task.create({
      ...data,
      assignee: assigneeId,
      createdBy: user._id,
      order
    });

    await task.populate([
      { path: 'assignee', select: 'name email role' },
      { path: 'createdBy', select: 'name email role' }
    ]);

    await activityService.logActivity({
      task,
      taskTitle: task.title,
      actor: user._id,
      type: 'task_created',
      meta: {
        status: task.status,
        priority: task.priority
      }
    });

    return task;
  }

  async getTasks(query, user) {
    const filter = this.buildFilter(user, query);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const sortField = query.sort || 'dueDate';
    const isAsc = query.order !== 'desc';
    const sortOrder = isAsc ? 1 : -1;

    let sortOption = {};
    if (sortField === 'dueDate') {
      // Put null due dates last when sorting ascending
      sortOption = { dueDate: sortOrder, createdAt: -1 };
    } else if (sortField === 'priority') {
      sortOption = { priority: sortOrder, dueDate: 1 };
    } else if (sortField === 'order') {
      sortOption = { order: 1, createdAt: -1 };
    } else {
      sortOption = { [sortField]: sortOrder };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'name email role')
        .populate('createdBy', 'name email role')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    return {
      tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTaskById(id, user) {
    const task = await Task.findById(id)
      .populate('assignee', 'name email role')
      .populate('createdBy', 'name email role');

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    // RBAC: Check access. If unauthorized, return 404 to avoid leaking existence
    if (
      user.role !== 'admin' &&
      task.createdBy._id.toString() !== user._id.toString() &&
      task.assignee?._id?.toString() !== user._id.toString()
    ) {
      throw ApiError.notFound('Task not found');
    }

    return task;
  }

  async updateTask(id, data, user) {
    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    // RBAC: Admin can edit any task; User can only edit tasks they created
    if (user.role !== 'admin' && task.createdBy.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only edit tasks that you created');
    }

    const previousValues = {
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
      assignee: task.assignee ? task.assignee.toString() : null
    };

    // Apply updates
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.status !== undefined) task.status = data.status;
    if (data.dueDate !== undefined) task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.order !== undefined) task.order = data.order;
    if (data.assignee !== undefined) {
      // Role-based restriction: Only admin can assign tasks to other users; normal users can only assign to themselves.
      if (user.role !== 'admin') {
        if (data.assignee && data.assignee.toString() !== user._id.toString()) {
          throw ApiError.forbidden('Only administrators can assign tasks to other team members');
        }
      }

      if (data.assignee) {
        const assigneeUser = await User.findById(data.assignee);
        if (!assigneeUser || !assigneeUser.isActive) {
          throw ApiError.badRequest('Assignee not found or inactive');
        }
        task.assignee = assigneeUser._id;
      } else {
        if (user.role !== 'admin') {
          task.assignee = user._id;
        } else {
          task.assignee = null;
        }
      }
    }

    await task.save();

    await task.populate([
      { path: 'assignee', select: 'name email role' },
      { path: 'createdBy', select: 'name email role' }
    ]);

    // Track activity events
    if (previousValues.status !== task.status) {
      await activityService.logActivity({
        task,
        taskTitle: task.title,
        actor: user._id,
        type: 'status_changed',
        meta: { from: previousValues.status, to: task.status }
      });
    }

    if (previousValues.priority !== task.priority) {
      await activityService.logActivity({
        task,
        taskTitle: task.title,
        actor: user._id,
        type: 'priority_changed',
        meta: { from: previousValues.priority, to: task.priority }
      });
    }

    const currentAssigneeStr = task.assignee?._id ? task.assignee._id.toString() : null;
    if (previousValues.assignee !== currentAssigneeStr) {
      await activityService.logActivity({
        task,
        taskTitle: task.title,
        actor: user._id,
        type: 'assignee_changed',
        meta: {
          from: previousValues.assignee,
          to: currentAssigneeStr,
          toName: task.assignee?.name || 'Unassigned'
        }
      });
    }

    const newDueDateStr = task.dueDate ? task.dueDate.toISOString().split('T')[0] : null;
    if (previousValues.dueDate !== newDueDateStr) {
      await activityService.logActivity({
        task,
        taskTitle: task.title,
        actor: user._id,
        type: 'due_date_changed',
        meta: { from: previousValues.dueDate, to: newDueDateStr }
      });
    }

    return task;
  }

  async updateTaskStatus(id, { status, order }, user) {
    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    // RBAC: Admin, creator, or assignee can change status/order
    const isCreator = task.createdBy.toString() === user._id.toString();
    const isAssignee = task.assignee?.toString() === user._id.toString();
    if (user.role !== 'admin' && !isCreator && !isAssignee) {
      throw ApiError.forbidden('You do not have permission to change this task status');
    }

    const oldStatus = task.status;
    task.status = status;
    if (order !== undefined) {
      task.order = order;
    }

    await task.save();

    await task.populate([
      { path: 'assignee', select: 'name email role' },
      { path: 'createdBy', select: 'name email role' }
    ]);

    if (oldStatus !== status) {
      await activityService.logActivity({
        task,
        taskTitle: task.title,
        actor: user._id,
        type: 'status_changed',
        meta: { from: oldStatus, to: status }
      });
    }

    return task;
  }

  async deleteTask(id, user) {
    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    // RBAC: Admin or creator can delete
    if (user.role !== 'admin' && task.createdBy.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only delete tasks that you created');
    }

    const taskTitle = task.title;

    // Delete associated comments
    await Comment.deleteMany({ task: id });

    await task.deleteOne();

    await activityService.logActivity({
      task: null,
      taskTitle,
      actor: user._id,
      type: 'task_deleted',
      meta: { taskId: id }
    });

    return { message: 'Task deleted successfully' };
  }

  async getTasksForExport(query, user) {
    const filter = this.buildFilter(user, query);

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    return tasks;
  }
}

module.exports = new TaskService();
