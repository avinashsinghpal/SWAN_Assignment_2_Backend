const { z } = require('zod');

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters'),
    email: z
      .string()
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(passwordRegex, 'Password must contain at least one letter and one number'),
    confirmPassword: z.string(),
    role: z.enum(['admin', 'user']).optional().default('user')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(passwordRegex, 'Password must contain at least one letter and one number'),
    confirmNewPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword']
  });

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};
