const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid resource ID format'
});

const paramIdSchema = z.object({
  id: objectIdSchema
});

module.exports = {
  objectIdSchema,
  paramIdSchema
};
