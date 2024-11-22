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

// function to add the user chat into a PDF
export async function appendChatToPDF(question, answer) {
    try {
        // Get the PDF file from the session folder
        const sessionFolderPath = path.resolve('./session');
        const files = fs.readdirSync(sessionFolderPath);

        // Find the first PDF file in the session folder
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        if (pdfFiles.length === 0) {
            throw new Error('No PDF files found in the session folder.');
        }

        const filePath = path.join(sessionFolderPath, pdfFiles[0]);
        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        // Create a new page for each question-answer pair
        const newPage = pdfDoc.addPage();
        const { width, height } = newPage.getSize();

        // Define the text content
        const text = `**Question:** ${question}\n**Answer:** ${answer}`;
        let y = height - 60; // Start 60 units from the top
        const lineHeight = 20; // Adjust line height for larger font
        const maxLineWidth = width - 80; // Leave 40 units padding on each side

        text.split('\n').forEach((line) => {
            const isBold = line.startsWith('**') && line.endsWith('**');
            const content = line.replace(/\*\*/g, ''); // Remove '**' markers
            const font = isBold ? timesBoldFont : timesRomanFont;

            // Word-wrap logic to split long lines
            const words = content.split(' ');
            let lineToDraw = '';

            words.forEach((word) => {
                const testLine = lineToDraw + word + ' ';
                const textWidth = font.widthOfTextAtSize(testLine, 16); // Adjust for 16 font size

                if (textWidth > maxLineWidth) {
                    newPage.drawText(lineToDraw.trim(), {
                        x: 40, // Align text with left padding
                        y,
                        size: 16, // Set font size to 16
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
                newPage.drawText(lineToDraw.trim(), {
                    x: 40, // Align text with left padding
                    y,
                    size: 16, // Set font size to 16
                    font,
                    color: rgb(0, 0, 0),
                });
                y -= lineHeight;
            }
        });

        // Save and write the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, modifiedPdfBytes);
        console.log('Chat added to PDF successfully with neat alignment and larger font size');
    } catch (error) {
        console.error('Error while appending chat to PDF', error);
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
        // Generate a timestamp and construct the new PDF filename
        const timestamp = Date.now();
        const pdfFilename = `userSession_${timestamp}.pdf`;
        const pdfPath = path.resolve(`./session/${pdfFilename}`);

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Embed the Times Roman font
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

        // Add an empty first page
        pdfDoc.addPage();

        // Add a second page for dealer info
        const secondPage = pdfDoc.addPage();
        const { width, height } = secondPage.getSize();

        // Set font size and line height
        const fontSize = 16;
        const lineHeight = fontSize + 4;

        // Prepare the text content for the dealer information
        const dealerInfoLines = [
            `Dealer Name: ${dealerName}`,
            `Dealer Info: ${dealerInfo}`,
            `Dealer Number: ${dealerNumber}`,
        ];

        // Define the starting position for text
        let y = height - 50; // Start 50 points from the top
        const x = 50; // Margin from the left

        // Add each line of dealer information to the page
        dealerInfoLines.forEach((line) => {
            secondPage.drawText(line, {
                x,
                y,
                size: fontSize,
                font: timesRomanFont,
                color: rgb(0, 0, 0),
            });
            y -= lineHeight; // Move down for the next line
        });

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('Dealer Info saved to:', pdfFilename);

        // Return the path of the saved PDF
        return pdfPath;

    } catch (error) {
        console.error('Error while creating PDF with dealer info:', error);
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
        
    } catch(err) {
        console.error('Error while storing chat into JSON array', err);
    }
}