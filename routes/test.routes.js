import express from 'express';
import { testConnection } from '../controller/test.controller.js';

const router = express.Router();

router.route('/testConnection')
    .get(testConnection);

export default router;
