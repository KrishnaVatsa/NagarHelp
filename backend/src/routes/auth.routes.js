import express from 'express';
import { register, login, logout, getProfile, updateProfile, addGuardian, removeGuardian, getGuardians, getWards, syncProfile, googleLogin } from '../controllers/auth.controller.js';
import { sendOTP, verifyOTP } from '../controllers/otp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/sync-profile', syncProfile);
router.post('/google-login', googleLogin);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// Guardian Mode
router.get('/guardians', authenticate, getGuardians);
router.post('/guardians', authenticate, addGuardian);
router.delete('/guardians/:guardianId', authenticate, removeGuardian);
router.get('/wards', authenticate, getWards);

export default router;