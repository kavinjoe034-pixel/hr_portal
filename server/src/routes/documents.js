const express = require('express');
const { authenticate } = require('../middleware/auth');
const { generateDocuments } = require('../controllers/documentController');

const router = express.Router();

router.use(authenticate);

router.post('/candidates/:id', generateDocuments);

module.exports = router;
