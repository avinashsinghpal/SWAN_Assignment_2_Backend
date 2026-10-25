const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
      default: null
    },
    taskTitle: {
      type: String,
      required: true,
      trim: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'task_created',
        'status_changed',
        'priority_changed',
        'assignee_changed',
        'due_date_changed',
        'task_updated',
        'comment_added',
        'task_deleted'
      ],
      index: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
