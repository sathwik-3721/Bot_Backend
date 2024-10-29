const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();    

const app = express();

app.use(cors());

app.use(express.json());

app.post('/get-response', async(req, res) => {
    try {
        // get the message from body
        const userMessage = req.body.userMessage;

        // initialize gemini model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // prompt for answering questions
        const prompt = `You are an expert in giving optimal and best answer for questions asked by the user. 
                        Now your task is to provide the best answer for the given question by the user. 
                        The question might be related to anything.
                        The question you must answer is: ${userMessage}`;
                    
        // console.log('pro', prompt);

        // get the response from the model
        const result = await model.generateContent(prompt);
        const botResponse = result.response.text();

        // return the response as json
        return res.status(200).json({ success: true, botResponse: botResponse });
    } catch (err) {
        console.error('Error occurred:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: err.response?.data || err.message 
        });
    }  
});

// test api
app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Hello'});
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});