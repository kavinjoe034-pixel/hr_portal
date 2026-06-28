const path = require('path');
require('dotenv').config({ path: path.resolve('/mnt/c/Users/ayush/Desktop/ayush_learnings/hr_portal/.env') });

const port = parseInt(process.env.PORT || '5000', 10);
const mongoUri = process.env.MONGO_URI || 'mongodb://kavinjoe034_db_user:xwvmbVk6R5KXc6w2@ac-pu3inf6-shard-00-00.dpe8q7o.mongodb.net:27017,ac-pu3inf6-shard-00-01.dpe8q7o.mongodb.net:27017,ac-pu3inf6-shard-00-02.dpe8q7o.mongodb.net:27017/?ssl=true&replicaSet=atlas-15ieka-shard-0&authSource=admin&appName=Cluster0';
const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-me';
const clientUrl = process.env.CLIENT_URL || 'https://agent-6a4161ab710174707a0--earnest-dragon-065aee.netlify.app';
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

// Cloudinary configuration
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dd7lihgvm';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '247815895662816';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || 'GHtlGNP_yWtIFWgnFgJShMj1MJY';

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
