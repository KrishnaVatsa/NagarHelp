import { storage } from './firebaseAdmin.js';
import fs from 'fs';
import path from 'path';

// Helper to get the bucket
const getBucket = () => {
    return storage.bucket();
};

export const uploadFile = async (filePath, folder = 'uploads') => {
    try {
        if (!filePath) return null;
        const bucket = getBucket();
        const fileName = `${folder}/${Date.now()}_${path.basename(filePath)}`;
        
        const file = bucket.file(fileName);
        await bucket.upload(filePath, {
            destination: fileName,
            public: true,
        });

        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        // Clean up local file
        fs.unlinkSync(filePath);
        return url;
    } catch (error) {
        console.error("Firebase Storage Upload Error:", error);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return null;
    }
};

export const uploadBase64Media = async (base64, mimeType, reportId, folder = 'reports') => {
    try {
        const bucket = getBucket();
        const buffer = Buffer.from(base64, 'base64');
        const extension = mimeType.split('/')[1] || 'jpg';

        const fileName = `${folder}/${reportId}_${Date.now()}.${extension}`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: mimeType },
            public: true
        });

        await file.makePublic();

        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (error) {
        console.error("Firebase Storage Base64 Upload Error:", error);
        return null;
    }
};

export const deleteFile = async (fileUrl) => {
    try {
        if (!fileUrl) return;
        const bucket = getBucket();
        
        // Extract file path from URL
        // https://storage.googleapis.com/bucket-name/folder/filename.jpg
        const urlParts = fileUrl.split(`${bucket.name}/`);
        if (urlParts.length === 2) {
            const filePath = urlParts[1];
            await bucket.file(filePath).delete();
        }
    } catch (error) {
        console.error("Firebase Storage Delete Error:", error);
    }
};