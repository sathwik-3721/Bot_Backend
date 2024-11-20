// import serviceAccount from '../service_account.json' assert { type: 'json'};
import { appendChatToPDF, generateSpeechBuffer } from '../utils/helper.js';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai'
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

        // authenticate the vertexAI
        // const auth = new GoogleAuth({ keyFilename: path.resolve('./service_account.json')});

        // initialize the vertex ai
        // const vertexAI = new VertexAI({ 
        //                         project: process.env.PROJECT_ID, 
        //                         location: process.env.LOCATION, 
        //                         googleAuthOptions: { credentials: '../service_account.json' }});

        // // initialize the genai model using vertexai
        // const generativeModel = vertexAI.getGenerativeModel({ model: process.env.MODEL })

        // define the prompt
        const prompt = process.env.PROMPT + userMessage;

        // get response from model
        const result = await model.generateContent(prompt);
        const botResponse = result.response.text();
        // get resopnse from the model
        // const result = await generativeModel.generateContent(prompt);
        // console.log('res,', result)
        // const botResponse = result.response.candidates[0].content.parts[0].text;

        // get the buffer for text by calling the function
        const audioBuffer = await generateSpeechBuffer(botResponse);

        // use function to save it in pdf
        appendChatToPDF(userMessage, botResponse);

        // return the response as json
        return res.status(200).json({ success: true, botResponse: botResponse, audioContent: audioBuffer });
    } catch(error) {
        console.error('Error occurred:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.response?.data || error.message 
        });
    }
}