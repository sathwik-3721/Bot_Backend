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

// function to clear the pdf contents
export async function clearPDF() {
    try {
        // get the pdf from path
        const pdfPath = path.resolve('./session/userSession.pdf');

        if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
            console.error("PDF file not found or is empty at path:", pdfPath);
            return;
        }

        const pdfBytes = fs.readFileSync(pdfPath);

        if (!pdfBytes.slice(0, 4).equals(Buffer.from('%PDF'))) {
            console.error("The file does not have a valid PDF header. It may not be a PDF.");
            return;
        }

        // load the file
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        if (pages.length <= 1) {
            console.log('PDF has one or no pages; no need to clear additional pages.');
            return;
        }

        // remove all pages except the first one
        for (let i = 1; i < pages.length; i++) {
            pdfDoc.removePage(pages.length - i);
        }

        const newPDFBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, newPDFBytes);

        console.log('Cleared PDF except for the first page');
    } catch (error) {
        console.error('Error while clearing the pages of PDF:', error);
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

export async function appendDealerInfoToPDF(dealerName, dealerInfo, dealerNumber) {
    try {
        // Get and load the existing PDF file
        const pdfPath = path.resolve('./session/userSession.pdf');
        const existingPdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // Create a new page in the PDF
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Prepare the text content for the dealer information
        const textContent = `
            Dealer Name: ${dealerName}
            Dealer Info: ${dealerInfo}
            Dealer Number: ${dealerNumber}
        `;

        // Add the dealer information on the new page
        page.drawText(textContent, {
            x: 50,
            y: height - 50,
            size: 12,
            color: rgb(0, 0, 0),
        });

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('Dealer Info added on a new page in the PDF file');
    } catch (error) {
        console.error('Error while appending dealer info into PDF:', error);
    }
}