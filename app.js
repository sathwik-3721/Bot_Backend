import sessionRoutes from './routes/session.routes.js';
import chatRoutes from './routes/chat.routes.js';
import testRoutes from './routes/test.routes.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();    

const app = express();

app.use(cors());

app.use(express.json());

// test api
app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Hello'});
});

app.use('/chat', chatRoutes);

app.use('/test', testRoutes);

app.use('/session', sessionRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});