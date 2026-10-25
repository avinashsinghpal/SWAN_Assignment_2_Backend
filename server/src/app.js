const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');

const corsMiddleware = require('./config/cors');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');
const activityRoutes = require('./routes/activity.routes');
const statsRoutes = require('./routes/stats.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const { setupSwagger } = require('./docs/swagger');

const app = express();

// Trust proxy for reverse proxies (Render, Railway, etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Request body parsers with size limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Response compression
app.use(compression());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global API Rate Limiter
app.use('/api', apiLimiter);

// Liveness health checks
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Main API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/users', userRoutes);

// OpenAPI Documentation
setupSwagger(app);

// Fallback 404 handler
app.use(notFound);

// Central error handler
app.use(errorHandler);

module.exports = app;
