import { Router } from 'express';
import { getUsers, registerUser } from '../controllers/authController';

const router = Router();

router.get('/users', getUsers);
router.post('/register', registerUser);

export default router;
