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
    keyFilename: path.join(__dirname, '../service_account.json') 
});

// function to add the user chat into a PDF
export async function appendChatToPDF(question, answer) {
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

// function to delete all the pages except first one
export async function clearPDF() {
    try {
        // get and load the existing pdf 
        const pdfPath = './session/userSession.pdf';
        const pdfDoc = await PDFDocument.load(pdfPath);

        // copy the first page
        const [ firstPage ] = await pdfDoc.copyPages(pdfDoc, [0]);

        // create a new pdf and add the blank page and save it
        const newPdfDoc = await PDFDocument.create();
        newPdfDoc.addPage(firstPage);
        const newPDF = await newPdfDoc.save();

        // save the pdf into existing path
        fs.writeFileSync(pdfPath, newPDF);

        console.log('Removed all pages and stored it in existing path')
    } catch(error) {
        console.error('Error while clearing the pages of PDF', error.message);
    }
}

// function to delete the existing file in the bucket
export async function deletePDF() {
    try {
        // get all files
        const [ files ] = await storage.bucket(bucketName).getFiles();

        // delete all files
        await Promise.all(files.map(file => file.delete()));

        console.log('Delete all files in the bucket');
    } catch(error) {
        console.error('Error while deleting the objects in the bucket', error.message);
    }
}

export async function appendDealerInfo(dealerName, dealerInfo, dealerNumber) {
    const pdfPath = './session/userSession.pdf';
    try {
        const existingPdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // get first page and add the data
        const page = pdfDoc.getPages()[0];
        const { width, height } = pages.getSize();

        const textContent = `
                    Dealer Name: ${dealerName}
                    Dealer Info: ${dealerInfo}
                    Dealer Number: ${dealerNumber}
                `;

        // add content into pdf 
        page.drawText(textContent, {
            x: 50,
            y: height - 100,
            size: 12,
            color: rgb(0, 0, 0),
        });

        // save the file
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('Dealer Info added into file');
    } catch(error) {
        console.error('Error while appending dealer info into PDF', error.message);
    }
}