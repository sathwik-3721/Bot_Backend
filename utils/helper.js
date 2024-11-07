import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// load env variables
dotenv.config();

// get the bucket name from the env
const bucketName = process.env.BUCKET_NAME;

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// stotage initialize 
const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: path.join(__dirname, '../service_account.json') // Adjust path to root directory
});

export async function appendToPDF(question, answer) {
    const filePath = './session/userSession.pdf';
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Create a new page for each question-answer pair
    const newPage = pdfDoc.addPage();
    const { width, height } = newPage.getSize();

    // Define the text content
    const text = `**Question:** ${question}\n**Answer:** ${answer}`;
    let y = height - 40;
    const lineHeight = 14;
    const maxLineWidth = width - 100;  // Leave some padding

    text.split('\n').forEach((line) => {
        const isBold = line.startsWith('**') && line.endsWith('**');
        const content = line.replace(/\*\*/g, '');  // Remove '**' markers
        const font = isBold ? timesBoldFont : timesRomanFont;
        
        // Word-wrap logic to split long lines
        const words = content.split(' ');
        let lineToDraw = '';
        
        words.forEach((word) => {
            const testLine = lineToDraw + word + ' ';
            const textWidth = font.widthOfTextAtSize(testLine, 12);

            if (textWidth > maxLineWidth) {
                newPage.drawText(lineToDraw, {
                    x: 50,
                    y,
                    size: 12,
                    font,
                    color: rgb(0, 0, 0),
                });
                y -= lineHeight;
                lineToDraw = word + ' ';
            } else {
                lineToDraw = testLine;
            }
        });

        if (lineToDraw) {
            newPage.drawText(lineToDraw, {
                x: 50,
                y,
                size: 12,
                font,
                color: rgb(0, 0, 0),
            });
            y -= lineHeight;
        }
    });

    // Save and write the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, modifiedPdfBytes);
}

// helper function to enable cors for it
export async function enableCORS() {
    try {
        const bucket = storage.bucket(bucketName);

        // define the cors config
        const corsConfig = [
            {
                origin: ['*'], // allow all origin requests
                method: ['GET', 'PUT', 'POST', 'DELETE'], // allowed methods
            },
        ];

        // set the cors configuration for the bucket
        await bucket.setCorsConfiguration(corsConfig);
        console.log('CORS configuration has been set for the bucket');
    } catch(error) {
        console.error('Error enabling CORS:', error.message);
    }
}