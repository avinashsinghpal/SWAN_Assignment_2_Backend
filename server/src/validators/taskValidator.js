const { z } = require('zod');
const { objectIdSchema } = require('./commonValidator');

const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  status: z.enum(['todo', 'in_progress', 'completed']).optional().default('todo'),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        // Cannot be earlier than today on create
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return d >= startOfToday;
      },
      { message: 'Due date cannot be set earlier than today' }
    ),
  assignee: objectIdSchema.optional().nullable(),
  order: z.number().optional().default(0)
});

const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: 'Invalid due date' }
    ),
  assignee: objectIdSchema.optional().nullable(),
  order: z.number().optional()
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed']),
  order: z.number().optional()
});

const taskQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(), // can be comma-separated or single
  priority: z.string().optional(), // can be comma-separated or single
  assignee: z.string().optional(),
  overdue: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  sort: z.enum(['dueDate', 'createdAt', 'priority', 'title', 'order']).optional().default('dueDate'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema
};
