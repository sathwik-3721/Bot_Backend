import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import appendToPDF from '../utils/helper.js';
dotenv.config();

export async function getResopnse(req, res) {
    try {
        // get the message from body
        const userMessage = req.body.userMessage;
        // console.log('um', userMessage);

        // initialize gemini model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // prompt for answering questions
        const prompt = `You are an expert in giving optimal and best answer without using any symbols or emojis for questions asked by the user. 
                        Now your task is to provide the best answer for the given question by the user. 
                        The question might be related to anything. Make sure that your answer muat not contain any emojis. 
                        The question you must answer is: ${userMessage}`;
                    
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