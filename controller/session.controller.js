import { Storage } from '@google-cloud/storage';
import { enableCORS } from '../utils/helper.js';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const bucketName = process.env.BUCKET_NAME;

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Google Cloud Storage with the service account key file
const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: path.join(__dirname, '../service_account.json') // Adjust path to root directory
});

export async function uploadSession(req, res) {
    try {
        // enable the cors by calling the function
        enableCORS();
        
        // Define the file path and destination within the bucket
        const filePath = path.join(__dirname, '../session/userSession.pdf'); // Adjust path to the PDF file
        const destination = 'session/userSession.pdf';

        // Upload the PDF file to the specified bucket
        await storage.bucket(bucketName).upload(filePath, {
            destination,
            gzip: true,
            metadata: {
                cacheControl: 'public, max-age=31536000'
            },
        });

        // Construct the public URL for the uploaded file
        const fileUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;

        console.log('File uploaded!');
        return res.status(201).json({ success: true, message: 'File successfully uploaded', url: fileUrl });
    } catch (error) {
        console.error('Error occurred:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};
