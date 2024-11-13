import { appendChatToPDF } from '../utils/helper.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

export async function getResponse(req, res) {
    try {
        // get the message from body
        const userMessage = req.body.userMessage;
        // console.log('um', userMessage);

        // initialize gemini model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.MODEL });

        // define the prompt
        const prompt = process.env.PROMPT + userMessage;

        // get response from model
        const result = await model.generateContent(prompt);
        const botResponse = result.response.text();

        // use function to save it in pdf
        appendChatToPDF(userMessage, botResponse);

        // return the response as json
        return res.status(200).json({ success: true, botResponse: botResponse });
    } catch(error) {
        console.error('Error occurred:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.response?.data || error.message 
        });
    }
}