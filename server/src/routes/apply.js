const express = require('express');
const { validateToken, submitForm } = require('../controllers/applyController');

const router = express.Router();

router.get('/:token', validateToken);
router.post('/:token', submitForm);

module.exports = router;
