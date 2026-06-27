const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  listCandidates,
  createCandidate,
  getProfile,
} = require('../controllers/candidateController');

const router = express.Router();

router.use(authenticate);

router.get('/', listCandidates);
router.post('/', upload.single('resume'), handleMulterError, createCandidate);
router.get('/:id', getProfile);

module.exports = router;
