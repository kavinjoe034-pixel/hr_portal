const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  scheduleInterview,
  addFeedback,
  listInterviews,
} = require('../controllers/interviewController');

const router = express.Router();

router.use(authenticate);

router.get('/', listInterviews);
router.post('/candidates/:id', scheduleInterview);
router.patch('/:id/feedback', addFeedback);

module.exports = router;
