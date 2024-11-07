import express from 'express';
import { uploadSession } from '../controller/session.controller.js';

const router = express.Router();

router.route('/uploadSession')
    .post(uploadSession);

export default router;