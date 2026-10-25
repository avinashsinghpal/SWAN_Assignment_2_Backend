const User = require('../models/User');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

class UserService {
  async getMembers() {
    const users = await User.find({ isActive: true })
      .select('_id name email role')
      .sort({ name: 1 });

    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      initials: getInitials(u.name)
    }));
  }

  async getUsersList(query) {
    const filter = {};
    if (query.search && query.search.trim()) {
      const reg = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
      filter.$or = [{ name: reg }, { email: reg }];
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // Aggregate task counts for each user
    const userIds = users.map((u) => u._id);
    const taskCounts = await Task.aggregate([
      { $match: { assignee: { $in: userIds } } },
      {
        $group: {
          _id: '$assignee',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const taskCountMap = {};
    taskCounts.forEach((c) => {
      taskCountMap[c._id.toString()] = {
        total: c.totalTasks,
        completed: c.completedTasks
      };
    });

    const enrichedUsers = users.map((u) => {
      const counts = taskCountMap[u._id.toString()] || { total: 0, completed: 0 };
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        initials: getInitials(u.name),
        taskCounts: counts
      };
    });

    return {
      users: enrichedUsers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUserRoleOrStatus(targetUserId, { role, isActive }, currentUser) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw ApiError.notFound('User not found');
    }

    // Rule: An admin cannot demote or deactivate themselves
    const isSelf = targetUser._id.toString() === currentUser._id.toString();
    if (isSelf) {
      if (role !== undefined && role !== 'admin') {
        throw ApiError.badRequest('You cannot demote yourself from the admin role');
      }
      if (isActive !== undefined && !isActive) {
        throw ApiError.badRequest('You cannot deactivate your own account');
      }
    }

    // Rule: The last remaining active admin cannot be demoted or deactivated
    if (targetUser.role === 'admin' && (role === 'user' || isActive === false)) {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isActive: true
      });
      if (activeAdminCount <= 1) {
        throw ApiError.badRequest('Cannot demote or deactivate the last remaining admin');
      }
    }

    if (role !== undefined) targetUser.role = role;
    if (isActive !== undefined) targetUser.isActive = isActive;

    await targetUser.save();

    return {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      isActive: targetUser.isActive,
      initials: getInitials(targetUser.name)
    };
  }
}

module.exports = new UserService();
