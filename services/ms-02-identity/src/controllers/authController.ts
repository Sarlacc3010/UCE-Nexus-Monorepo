import { Request, Response } from 'express';
import { keycloakService } from '../services/keycloakService';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await keycloakService.getUsers();
    res.status(200).json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users from Keycloak' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, firstName, lastName, password } = req.body;
    
    const newUser = await keycloakService.createUser({
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        }
      ]
    });
    
    res.status(201).json({ message: 'User registered successfully', id: newUser.id });
  } catch (error: any) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ error: 'Failed to create user in Keycloak' });
  }
};
