const express = require('express');
const commentController = require('../controllers/commentController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { paramIdSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

// DELETE /comments/:id
router.delete('/:id', validate({ params: paramIdSchema }), commentController.deleteComment);

module.exports = router;
