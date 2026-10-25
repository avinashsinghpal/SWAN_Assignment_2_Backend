const mongoose = require('mongoose');
const { isTaskOverdue } = require('../utils/dates');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    reminderSentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Virtual property for overdue status
taskSchema.virtual('isOverdue').get(function () {
  return isTaskOverdue(this.dueDate, this.status);
});

// Compound indexes
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ title: 'text' });

// Pre-save hook to automatically maintain completedAt
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
