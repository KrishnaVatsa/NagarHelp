import { auth } from '../services/firebaseAdmin.js';
import { User } from '../models/user.model.js';

export const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }
        const token = authHeader.split(' ')[1];
        
        // Verify token using Firebase Admin
        const decodedToken = await auth.verifyIdToken(token);
        
        // Find MongoDB user
        const user = await User.findOne({ 
            $or: [{ firebaseUid: decodedToken.uid }, { email: decodedToken.email }] 
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in database. Please login again to sync profile.' });
        }
        
        // Attach user info to request object
        req.user = user;
        req.firebaseUser = decodedToken; // Keep firebase claims if needed
        
        next();
    } catch (error) {
        console.error('Firebase Auth Error:', error);
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
};

// Also export as default `protect` to match typical auth.middleware exports
export const protect = verifyFirebaseToken;
