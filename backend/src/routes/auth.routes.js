import { Router } from 'express';
import { register, login, getMe, connectWallet, logout } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/connect-wallet', protect, connectWallet);
router.post('/logout', protect, logout);

export default router;
