const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadDir } = require('../config/env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err && err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ message: 'Only PDF files are allowed' });
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size exceeds 10 MB limit' });
  }

  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field' });
  }

  next(err);
};

module.exports = { upload, handleMulterError };
