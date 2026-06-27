const express = require('express');
const { authenticate } = require('../middleware/auth');
const { listJobs, createJob, updateJobStatus } = require('../controllers/jobController');

const router = express.Router();

router.use(authenticate);

router.get('/', listJobs);
router.post('/', createJob);
router.patch('/:id/status', updateJobStatus);

module.exports = router;
