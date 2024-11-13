import { appendChatToPDF } from '../utils/helper.js';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
dotenv.config();

export async function getResponse(req, res) {
    try {
        // get the message from body
        const userMessage = req.body.userMessage;
        // console.log('um', userMessage);

        // initialize vertex ai 
        const vertexAI = new VertexAI({ project: process.env.PROJECT_ID, location: process.env.LOCATION})

        // initialize genai model using vertexai
        const generativeModel = vertexAI.getGenerativeModel({
            model: process.env.MODEL,
        });

        // prompt for answering questions
        const prompt = process.env.PROMPT + `${userMessage}`;
                    
        // console.log('pro', prompt);

        // get the response from the model
        const result = await generativeModel.generateContent(prompt);
        // console.log('res', result);

        // access the text from the complete json
        const botResponse = result.response.candidates[0].content.parts[0].text;

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