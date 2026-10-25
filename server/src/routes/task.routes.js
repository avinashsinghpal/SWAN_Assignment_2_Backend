const express = require('express');
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const activityController = require('../controllers/activityController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { paramIdSchema } = require('../validators/commonValidator');
const {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema
} = require('../validators/taskValidator');
const { createCommentSchema } = require('../validators/commentValidator');

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

// CSV Export (Must be registered before :id)
router.get('/export/csv', taskController.exportCsv);

// Task CRUD
router.get('/', validate({ query: taskQuerySchema }), taskController.getTasks);
router.post('/', validate({ body: createTaskSchema }), taskController.createTask);

router.get('/:id', validate({ params: paramIdSchema }), taskController.getTaskById);
router.patch(
  '/:id',
  validate({ params: paramIdSchema, body: updateTaskSchema }),
  taskController.updateTask
);
router.patch(
  '/:id/status',
  validate({ params: paramIdSchema, body: updateTaskStatusSchema }),
  taskController.updateTaskStatus
);
router.delete('/:id', validate({ params: paramIdSchema }), taskController.deleteTask);

// Comments for task
router.get('/:id/comments', validate({ params: paramIdSchema }), commentController.getComments);
router.post(
  '/:id/comments',
  validate({ params: paramIdSchema, body: createCommentSchema }),
  commentController.addComment
);

// Task Activity timeline
router.get('/:id/activity', validate({ params: paramIdSchema }), activityController.getTaskActivity);

module.exports = router;
