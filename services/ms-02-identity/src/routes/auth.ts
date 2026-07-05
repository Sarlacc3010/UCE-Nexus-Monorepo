import { Router } from 'express';
import { getUsers, registerUser, login } from '../controllers/authController';

const router = Router();

router.get('/users', getUsers);
router.post('/register', registerUser);
router.post('/login', login);

export default router;
