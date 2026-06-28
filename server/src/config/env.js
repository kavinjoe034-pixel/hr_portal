const path = require('path');
require('dotenv').config({ path: path.resolve('/mnt/c/Users/ayush/Desktop/ayush_learnings/hr_portal/.env') });

const port = parseInt(process.env.PORT || '5000', 10);
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rove_hire';
const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-me';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

// Cloudinary configuration
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dmaaszoym';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '839524542566221';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || 'p57_q7l-HkcY1njRSczJ_PNSMdA';

module.exports = {
  port,
  mongoUri,
  jwtSecret,
  clientUrl,
  uploadDir,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
};
