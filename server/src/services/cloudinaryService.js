const cloudinary = require('cloudinary').v2;
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require('../config/env');
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
});

/**
 * Upload a PDF buffer to Cloudinary
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} fileName - Name for the file in Cloudinary (e.g., 'offer-letter-xxx')
 * @param {string} folder - Folder in Cloudinary (e.g., 'rove-hire/documents')
 * @returns {Promise<string>} - Secure URL of the uploaded file
 */
const uploadPdfToCloudinary = async (pdfBuffer, fileName, folder = 'rove-hire/documents') => {
  try {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // For PDFs
          public_id: fileName,
          folder: folder,
          format: 'pdf',
          // access_mode: 'token', // Restricted access
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error.message);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      // Write buffer to stream
      stream.end(pdfBuffer);
    });
  } catch (error) {
    console.error('Error uploading PDF to Cloudinary:', error.message);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary by public ID
 * @param {string} publicId - Public ID of the file in Cloudinary (e.g., 'rove-hire/documents/offer-letter-xxx')
 * @returns {Promise<object>} - Deletion result
 */
const deletePdfFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return result;
  } catch (error) {
    console.error('Error deleting PDF from Cloudinary:', error.message);
    throw error;
  }
};

const uploadResumeToCloudinary = async (
  filePath,
  fileName,
  folder = 'rove-hire/resumes'
) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder,
      public_id: fileName,
      overwrite: true,
      format: 'pdf',
    });

    console.log("result is: ",result);
    // Delete local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result.secure_url;
  } catch (error) {
    // Delete local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw error;
  }
};
module.exports = {
  uploadPdfToCloudinary,
  deletePdfFromCloudinary,
  cloudinary,
  uploadResumeToCloudinary
};
