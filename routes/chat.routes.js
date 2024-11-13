import express from 'express';
import { getResponse } from '../controller/chat.controller.js';

const router = express.Router();

router.route('/getResponse')
    .post(getResponse)

export default router;