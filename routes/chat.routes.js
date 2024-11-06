import express from 'express';
import { getResopnse } from '../controller/chat.controller.js';

const router = express.Router();

router.route('/getResponse')
    .post(getResopnse)

export default router;