import express from 'express';
import { appendDealerInfo } from '../controller/dealer.controller';

const router = express.router();

router.route('/appendDealerInfo')
    .post(appendDealerInfo)

export default router;