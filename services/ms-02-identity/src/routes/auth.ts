import { Router } from 'express';
import { getUsers, registerUser, login, updateUserRole } from '../controllers/authController';

const router = Router();

router.get('/users', getUsers);
router.post('/users', registerUser); // New RESTful route for user creation
router.put('/users/:id/roles', updateUserRole); // New RESTful route for role update
router.post('/register', registerUser); // Legacy support
router.post('/login', login);

export default router;
