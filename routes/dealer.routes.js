import express from 'express';
import { appendDealerInfo } from '../controller/dealer.controller.js';

const router = express.Router();

router.route('/appendDealerInfo')
    .post(appendDealerInfo)

export default router;