import { enableCORS, deletePDF, clearPDF, getPdfFileNames } from '../utils/helper.js';
import { chatHistory } from '../utils/helper.js';
import { Storage } from '@google-cloud/storage';
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
        // Enable CORS by calling the function
        enableCORS();

        // Get the PDF name from the local
        const sessionPDF = await getPdfFileNames();
        console.log('File to upload:', sessionPDF);

        // Define the file path and destination within the bucket
        const filePath = path.join(__dirname, `../session/${sessionPDF}`); // Adjust path to the PDF file
        const destination = `session/${sessionPDF}`;

        // Upload the PDF file to the specified bucket
        await storage.bucket(bucketName).upload(filePath, {
            destination,
            gzip: true,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });

        console.log('File uploaded successfully!');

        // Clear all the existing PDF content
        await clearPDF();

        // Fetch the latest uploaded file's public URL
        const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'session/' });
        const latestFile = files
            .filter(file => file.name === destination) // Ensure we're considering the just uploaded file
            .pop(); // Get the latest version (most relevant in this case as we know the file name)

        if (latestFile) {
            const fileUrl = `https://storage.googleapis.com/${bucketName}/${latestFile.name}`;
            return res.status(201).json({ success: true, message: 'File successfully uploaded', url: fileUrl, chatHistory: chatHistory });
        } else {
            throw new Error('Unable to fetch the uploaded file details.');
        }
    } catch (error) {
        console.error('Error occurred:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
