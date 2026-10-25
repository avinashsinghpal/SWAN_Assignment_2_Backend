const cron = require('node-cron');
const Task = require('../models/Task');
const env = require('../config/env');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');

async function processReminders() {
  logger.info('Running deadline reminder job...');

  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within 24 hours or newly overdue, not completed, and reminder not sent yet
    const tasksDue = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lte: in24Hours, $ne: null },
      assignee: { $ne: null },
      reminderSentAt: null
    }).populate('assignee', 'name email');

    if (tasksDue.length === 0) {
      logger.info('No pending task reminders to process');
      return;
    }

    // Group tasks by assignee email
    const tasksByUser = {};
    tasksDue.forEach((task) => {
      const email = task.assignee?.email;
      if (!email) return;
      if (!tasksByUser[email]) {
        tasksByUser[email] = {
          name: task.assignee.name,
          tasks: []
        };
      }
      tasksByUser[email].tasks.push(task);
    });

    for (const [email, userObj] of Object.entries(tasksByUser)) {
      const taskListText = userObj.tasks
        .map((t) => `- ${t.title} (Due: ${t.dueDate ? t.dueDate.toISOString().split('T')[0] : 'N/A'}, Priority: ${t.priority})`)
        .join('\n');

      const subject = `Tasklane: You have ${userObj.tasks.length} task${userObj.tasks.length > 1 ? 's' : ''} due soon`;
      const text = `Hello ${userObj.name},\n\nThe following tasks are due within 24 hours or need attention:\n\n${taskListText}\n\nPlease visit Tasklane to review and update your work.\n\nBest regards,\nTasklane Team`;

      await sendEmail({
        to: email,
        subject,
        text
      });

      // Mark tasks as reminder sent
      const taskIds = userObj.tasks.map((t) => t._id);
      await Task.updateMany(
        { _id: { $in: taskIds } },
        { reminderSentAt: new Date() }
      );
    }

    logger.info(`Processed reminders for ${tasksDue.length} tasks across ${Object.keys(tasksByUser).length} assignees`);
  } catch (err) {
    logger.error('Error in reminder job', { error: err.message });
  }
}

function startReminderJob() {
  if (!env.ENABLE_REMINDERS) {
    logger.info('Deadline reminder cron job is disabled via ENABLE_REMINDERS=false');
    return null;
  }

  // Run daily at 08:00 AM
  const job = cron.schedule('0 8 * * *', async () => {
    await processReminders();
  });

  logger.info('Deadline reminder cron job scheduled for daily 08:00 AM');
  return job;
}

module.exports = {
  processReminders,
  startReminderJob
};
