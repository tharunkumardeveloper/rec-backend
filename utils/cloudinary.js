// Cloudinary Upload Utility for TalentTrack
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Optional public ID
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadImage(base64Data, folder = 'talenttrack/screenshots', publicId = null) {
    try {
        const options = {
            folder,
            resource_type: 'image',
            format: 'jpg',
            quality: 'auto:good'
        };

        if (publicId) {
            options.public_id = publicId;
        }

        const result = await cloudinary.uploader.upload(base64Data, options);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary image upload error:', error);
        throw error;
    }
}

/**
 * Upload base64 PDF to Cloudinary
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Optional public ID
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadPDF(base64Data, folder = 'talenttrack/reports', publicId = null) {
    try {
        const options = {
            folder,
            resource_type: 'auto', // Changed from 'raw' to 'auto' to avoid untrusted account issues
            format: 'pdf'
        };

        if (publicId) {
            options.public_id = publicId;
        }

        const result = await cloudinary.uploader.upload(base64Data, options);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary PDF upload error:', error);
        throw error;
    }
}

/**
 * Upload base64 video to Cloudinary
 * @param {string} base64Data - Base64 encoded video data
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Optional public ID
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadVideo(base64Data, folder = 'talenttrack/videos', publicId = null) {
    try {
        const options = {
            folder,
            resource_type: 'video',
            format: 'webm'
        };

        if (publicId) {
            options.public_id = publicId;
        }

        const result = await cloudinary.uploader.upload(base64Data, options);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary video upload error:', error);
        throw error;
    }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Type of resource (image, video, raw)
 * @returns {Promise<object>} - Deletion result
 */
async function deleteFile(publicId, resourceType = 'image') {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
}

module.exports = {
    uploadImage,
    uploadPDF,
    uploadVideo,
    deleteFile,
    cloudinary
};
