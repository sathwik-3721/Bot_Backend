import textToSpeech from '@google-cloud/text-to-speech';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
const { TextToSpeechClient } = textToSpeech;

// load env variables
dotenv.config();

// get the bucket name from the env
const bucketName = process.env.BUCKET_NAME;

// initialize the client for text to speech service
const client = new textToSpeech.TextToSpeechClient({ keyFilename: './service_account.json' });

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// stotage initialize 
const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: path.join(__dirname, '../service_account.json') 
});

// define JSON to store questin and answer
export let chatHistory = [];

// function to add the user chat into a PDF
export async function appendChatToPDF(question, answer) {
    try {
        const sessionFolderPath = path.resolve('./session');
        const files = fs.readdirSync(sessionFolderPath);

        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        if (pdfFiles.length === 0) {
            throw new Error('No PDF files found in the session folder.');
        }

        const filePath = path.join(sessionFolderPath, pdfFiles[0]);
        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const logoBytes = fs.readFileSync('./assets/MSXi_Logo_Final.png');
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.15); 

        const newPage = pdfDoc.addPage();
        const { width, height } = newPage.getSize();

        //  border
        newPage.drawRectangle({
            x: 20,
            y: 20,
            width: width - 40,
            height: height - 40,
            borderColor: rgb(0, 0, 0),
            borderWidth: 2,
        });

        //  logo
        newPage.drawImage(logoImage, {
            x: 30,
            y: 30,
            width: logoDims.width,
            height: logoDims.height,
        });

        // remove symbols from text
        const sanitizedQuestion = question.replace(/\n/g, ' ').trim();
        const sanitizedAnswer = answer.replace(/\n/g, ' ').trim();

        // add bold for question heading
        let y = height - 60; 
        newPage.drawText(`Question:`, {
            x: 40,
            y,
            size: 14,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0),
        });

        // add question text
        y -= 20; 
        newPage.drawText(sanitizedQuestion, {
            x: 40,
            y,
            size: 14,
            font: helveticaFont,
            color: rgb(0, 0, 0),
        });

        // add bold for answer heading
        y -= 40; 
        newPage.drawText(`Answer:`, {
            x: 40,
            y,
            size: 14,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0),
        });

        // word wrap for answer alignment
        const maxLineWidth = width - 80; 
        const answerWords = sanitizedAnswer.split(' ');
        let currentLine = '';
        let currentY = y - 20;

        for (const word of answerWords) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            
            try {
                const textWidth = helveticaFont.widthOfTextAtSize(testLine, 14);

                if (textWidth > maxLineWidth) {
                    // Draw current line
                    newPage.drawText(currentLine, {
                        x: 40,
                        y: currentY,
                        size: 14,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                    currentY -= 20; 
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            } catch (encodeError) {
                console.warn(`Skipping problematic character in word: ${word}`);
                continue;
            }
        }

        // Draw any remaining text
        if (currentLine) {
            newPage.drawText(currentLine, {
                x: 40,
                y: currentY,
                size: 14,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });
        }

        // page numbers
        const totalPages = pdfDoc.getPageCount();
        pdfDoc.getPages().forEach((page, index) => {
            page.drawText(`Page ${index + 1} of ${totalPages}`, {
                x: width / 2 - 20,
                y: 30,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });
        });

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, modifiedPdfBytes);
        console.log('Chat added to PDF successfully with logo, border, and page numbers.');
    } catch (error) {
        console.error('Error while appending chat to PDF:', error);
    }
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

// function to delete the pdf contents
export async function clearPDF() {
    try {
        // get pdf name
        const sessionPDF = await getPdfFileNames();

        // get the pdf from path
        const pdfPath = path.resolve(`./session/${sessionPDF}`);

        if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
            console.error("PDF file not found or is empty at path:", pdfPath);
            return;
        }

        const pdfBytes = fs.readFileSync(pdfPath);

        if (!pdfBytes.slice(0, 4).equals(Buffer.from('%PDF'))) {
            console.error("The file does not have a valid PDF header. It may not be a PDF.");
            return;
        }
        // delete the pdf
        fs.unlinkSync(pdfPath);
        console.log("PDF File deleted from the session");
    } catch (error) {
        console.error('Error while deleting PDF:', error);
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
        const [ files_after ] = await storage.bucket(bucketName).getFiles();
        console.log('Delete after', files_after);
    } catch(error) {
        console.error('Error while deleting the objects in the bucket', error.message);
    }
}

// add dealer info to pdf
export async function appendDealerInfoToPDF(dealerName, dealerInfo, dealerNumber) {
    try {
        const timestamp = Date.now();
        const pdfFilename = `userSession_${timestamp}.pdf`;
        const pdfPath = path.resolve(`./session/${pdfFilename}`);

        const pdfDoc = await PDFDocument.create();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const logoBytes = fs.readFileSync('assets/MSXi_Logo_Final.png');
        const logoImage = await pdfDoc.embedPng(logoBytes);

        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Draw a single outer border
        page.drawRectangle({
            x: 20,
            y: 20,
            width: width - 40,
            height: height - 40,
            borderColor: rgb(0, 0, 0),
            borderWidth: 2,
        });

        // Add current date and time
        const currentDateTime = new Date().toLocaleString();

        // Add a centered main heading
        const headingText = "Chat Report";
        const headingFontSize = 18;
        const headingWidth = helveticaBoldFont.widthOfTextAtSize(headingText, headingFontSize);

        page.drawText(headingText, {
            x: (width - headingWidth) / 2, // Center-align
            y: height - 50, // Position 50 units below the top
            size: headingFontSize,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0),
        });

        // Add date and time below the heading
        const dateTimeFontSize = 14;
        const dateTimeWidth = helveticaFont.widthOfTextAtSize(currentDateTime, dateTimeFontSize);

        page.drawText(currentDateTime, {
            x: (width - dateTimeWidth) / 2, // Center-align
            y: height - 75, // Position below the heading
            size: dateTimeFontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
        });

        // Add logo at the bottom-left corner
        const logoDims = logoImage.scale(0.15); // Scale logo to appropriate size
        page.drawImage(logoImage, {
            x: 30, // Offset from the left border
            y: 30, // Offset from the bottom border
            width: logoDims.width,
            height: logoDims.height,
        });

        // Add dealer info above the logo with bold headings
        const dealerInfoLines = [
            { label: 'Dealer Name:', value: dealerName },
            { label: 'Dealer Info:', value: dealerInfo },
            { label: 'Dealer Number:', value: dealerNumber },
        ];

        let y = height - 120; // Start 120 units below the top border

        dealerInfoLines.forEach(({ label, value }) => {
            // Draw bold label (heading)
            page.drawText(label, {
                x: 40, // Align text with left border
                y,
                size: 14,
                font: helveticaBoldFont, // Use bold font for headings
                color: rgb(0, 0, 0),
            });

            // Draw regular value
            page.drawText(value, {
                x: 160, // Position value to the right of the label
                y,
                size: 14,
                font: helveticaFont, // Use regular font for values
                color: rgb(0, 0, 0),
            });

            y -= 20; // Move to the next line
        });

        // Add page number
        page.drawText('Page 1', {
            x: width / 2 - 20, // Center-align the page number
            y: 30, // Place above the bottom border
            size: 12,
            font: helveticaFont,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('Dealer Info PDF saved to:', pdfFilename);
        return pdfPath;
    } catch (error) {
        console.error('Error creating PDF:', error);
        throw error;
    }
}

// get the existing session pdf name
export async function getPdfFileNames() {
    try {
        const sessionFolderPath = path.resolve('./session');
        
        // Read all files in the session folder asynchronously
        const files = await fs.promises.readdir(sessionFolderPath);
        
        // Filter out PDF files
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        // Return the PDF file names
        console.log('PDF files in the session folder:', pdfFiles);
        return pdfFiles;
    } catch (error) {
        console.error('Error reading PDF files:', error);
        return [];
    }
}

// helper function to convert the text into buffer to play it into UI frontend
export async function generateSpeechBuffer(text) {
    try {
        // construct the request for API
        const request = {
            // passing text as input
            input: { text: text },
            // get the language code and model from env
            voice: { languageCode: process.env.LANGUAGE_CODE, name: process.env.MODEL_NAME, ssmlGender: process.env.SSML_GENDER },
            // select the audio configuration
            audioConfig: {audioEncoding: process.env.AUDIO_ENCODING},
        };

        // perform the request
        const [response] = await client.synthesizeSpeech(request);

        // return the binary audio content
        return response.audioContent;

    } catch(error) {
        console.error('Error while parsing the text into speech content:', error);
    }
}

// function to store the chat into a JSON array
export async function storeUserChat(quesiton, answer) {
    try {
        chatHistory.push({ quesiton: quesiton, answer: answer });
    } catch(err) {
        console.error('Error while storing chat into JSON array', err);
    }
}
