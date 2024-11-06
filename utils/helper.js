import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';  // Import form-data package

export default async function appendToPDF(question, answer) {
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

export async function uploadPDF(filePath) {
    let uploadedURL = '';
    const cloudinaryURL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`;
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));  // Attach your PDF file
    form.append('upload_preset', 'rzkkge3i'); // Set up an unsigned upload preset in your Cloudinary account

    try {
        const response = await axios.post(cloudinaryURL, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64')}`
            }
        });
        uploadedURL = response.data.secure_url;
        console.log('Upload Successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Upload Failed:', error);
    }
}

