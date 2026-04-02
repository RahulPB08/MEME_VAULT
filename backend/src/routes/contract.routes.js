import { Router } from 'express';
import { getContractInfo } from '../controllers/contract.controller.js';

const router = Router();

router.get('/info', getContractInfo);

export default router;
