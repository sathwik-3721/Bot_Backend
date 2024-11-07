import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { appendToPDF } from '../utils/helper.js';
dotenv.config();

export async function getResopnse(req, res) {
    try {
        // get the message from body
        const userMessage = req.body.userMessage;
        // console.log('um', userMessage);

        // initialize gemini model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.MODEL });

        // prompt for answering questions
        const prompt = process.env.PROMPT + `${userMessage}`;
                    
        // console.log('pro', prompt);

        // get the response from the model
        const result = await model.generateContent(prompt);
        const botResponse = result.response.text();

        // use function to save it in pdf
        appendToPDF(userMessage, botResponse);

        // return the response as json
        return res.status(200).json({ success: true, botResponse: botResponse });
    } catch(error) {
        console.error('Error occurred:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: err.response?.data || err.message 
        });
    }
}