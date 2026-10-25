const Task = require('../models/Task');
const { getStartOfToday } = require('../utils/dates');

class StatsService {
  async getOverview(user, { scope = 'all', days = 30 } = {}) {
    const filter = {};
    const effectiveScope = user.role === 'admin' ? scope : 'my';

    if (effectiveScope === 'my') {
      filter.$or = [
        { createdBy: user._id },
        { assignee: user._id }
      ];
    }

    const startOfToday = getStartOfToday();
    const daysInt = parseInt(days, 10) || 30;
    const pastBoundary = new Date();
    pastBoundary.setDate(pastBoundary.getDate() - daysInt);
    pastBoundary.setHours(0, 0, 0, 0);

    // 1. Aggregations for status, priority, and overall counts
    const [statusCounts, priorityCounts, totalCount, overdueCount] = await Promise.all([
      Task.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: filter },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.countDocuments(filter),
      Task.countDocuments({
        ...filter,
        status: { $ne: 'completed' },
        dueDate: { $lt: startOfToday, $ne: null }
      })
    ]);

    const statusMap = { todo: 0, in_progress: 0, completed: 0 };
    statusCounts.forEach((item) => {
      if (statusMap[item._id] !== undefined) {
        statusMap[item._id] = item.count;
      }
    });

    const priorityMap = { low: 0, medium: 0, high: 0 };
    priorityCounts.forEach((item) => {
      if (priorityMap[item._id] !== undefined) {
        priorityMap[item._id] = item.count;
      }
    });

    const completed = statusMap.completed;
    const pending = statusMap.todo + statusMap.in_progress;

    // 2. Series over time: created vs completed per day
    const [createdTimeline, completedTimeline] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            ...filter,
            createdAt: { $gte: pastBoundary }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            created: { $sum: 1 }
          }
        }
      ]),
      Task.aggregate([
        {
          $match: {
            ...filter,
            status: 'completed',
            completedAt: { $gte: pastBoundary, $ne: null }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            completed: { $sum: 1 }
          }
        }
      ])
    ]);

    // Build day-by-day continuous array for chart
    const timelineMap = {};
    for (let i = daysInt - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timelineMap[dateStr] = { date: dateStr, created: 0, completed: 0 };
    }

    createdTimeline.forEach((item) => {
      if (timelineMap[item._id]) {
        timelineMap[item._id].created = item.created;
      }
    });

    completedTimeline.forEach((item) => {
      if (timelineMap[item._id]) {
        timelineMap[item._id].completed = item.completed;
      }
    });

    const timeline = Object.values(timelineMap);

    // 3. Upcoming deadlines (next 5 tasks due)
    const upcomingDeadlines = await Task.find({
      ...filter,
      status: { $ne: 'completed' },
      dueDate: { $ne: null }
    })
      .populate('assignee', 'name email')
      .sort({ dueDate: 1 })
      .limit(5);

    const formattedDeadlines = upcomingDeadlines.map((task) => {
      const due = new Date(task.dueDate);
      const diffMs = due.getTime() - startOfToday.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let relativeText = '';
      if (diffDays < 0) {
        relativeText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
      } else if (diffDays === 0) {
        relativeText = 'Due today';
      } else if (diffDays === 1) {
        relativeText = 'Due tomorrow';
      } else {
        relativeText = `Due in ${diffDays} days`;
      }

      return {
        _id: task._id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        isOverdue: diffDays < 0,
        relativeText,
        assignee: task.assignee
      };
    });

    return {
      scope: effectiveScope,
      totals: {
        total: totalCount,
        pending,
        completed,
        overdue: overdueCount
      },
      byStatus: statusMap,
      byPriority: priorityMap,
      timeline,
      upcomingDeadlines: formattedDeadlines
    };
  }
}

module.exports = new StatsService();
