const { z } = require('zod');

const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment body cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters')
});

module.exports = {
  createCommentSchema
};
