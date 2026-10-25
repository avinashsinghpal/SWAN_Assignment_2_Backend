const { z } = require('zod');

const updateUserRoleOrStatusSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional()
}).refine((data) => data.role !== undefined || data.isActive !== undefined, {
  message: 'At least one field (role or isActive) must be provided'
});

const userQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

module.exports = {
  updateUserRoleOrStatusSchema,
  userQuerySchema
};
