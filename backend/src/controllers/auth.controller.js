import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Try to import Firebase Admin auth — it may fail if not configured
let adminAuth = null;
const getAdminAuth = async () => {
    if (adminAuth) return adminAuth;
    try {
        const firebaseAdmin = await import('../services/firebaseAdmin.js');
        adminAuth = firebaseAdmin.auth;
        return adminAuth;
    } catch (e) {
        console.warn('[Auth] Firebase Admin SDK not available — backend-side Firebase ops disabled.');
        return null;
    }
};
// Pre-initialize
getAdminAuth().catch(() => {});

export const register = asyncHandler(async (req, res) => {
    const { name, email, password, phone, role, address, city, department, firebaseUid } = req.body;

    if (!name || !email) {
        throw new ApiError(400, 'name and email are required');
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        // User exists — just return success (idempotent registration)
        const safeUser = await User.findById(existingUser._id).select('-password -refreshToken');
        return res.status(200).json(
            new ApiResponse(200, { user: safeUser }, 'User already registered')
        );
    }

    let resolvedFirebaseUid = firebaseUid;

    // If Firebase Admin is available AND no UID provided, create in Firebase Admin
    if (!resolvedFirebaseUid && adminAuth && password && password !== 'FIREBASE_AUTH') {
        try {
            const userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                phoneNumber: phone ? `+91${phone}` : undefined,
            });
            resolvedFirebaseUid = userRecord.uid;
        } catch (firebaseError) {
            // Firebase Admin creation is optional — log and continue
            console.warn('[Auth] Firebase Admin createUser failed (non-critical):', firebaseError.message);
        }
    }

    // Save to MongoDB
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: password || 'FIREBASE_AUTH_MANAGED',
        phone: phone || '',
        role: role || 'citizen',
        address,
        city,
        department,
        firebaseUid: resolvedFirebaseUid || undefined,
    });

    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    return res.status(201).json(
        new ApiResponse(201, { user: createdUser }, 'User registered successfully')
    );
});

export const login = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, {}, 'Please use Firebase Client SDK for login'));
});

export const logout = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, {}, 'Logged out'));
});

export const syncProfile = asyncHandler(async (req, res) => {
    const { uid } = req.body;
    const userId = uid || req.user?.uid;

    if (!userId) throw new ApiError(401, 'Unauthorized');

    try {
        let user = await User.findOne({ firebaseUid: userId });

        if (!user && adminAuth) {
            try {
                const userRecord = await adminAuth.getUser(userId);
                user = await User.findOne({ email: userRecord.email });
                if (user && !user.firebaseUid) {
                    user.firebaseUid = userId;
                    await user.save({ validateBeforeSave: false });
                }
                if (!user) {
                    user = await User.create({
                        name: userRecord.displayName || 'User',
                        email: userRecord.email,
                        firebaseUid: userId,
                        password: 'FIREBASE_AUTH_MANAGED',
                        phone: '',
                    });
                }
            } catch (e) {
                console.warn('[Sync] Firebase Admin getUser failed:', e.message);
            }
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const safeUser = await User.findById(user._id).select('-password -refreshToken');
        res.json(new ApiResponse(200, safeUser, 'Profile synced'));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});

export const googleLogin = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) throw new ApiError(400, 'idToken is required');

    if (!adminAuth) {
        return res.json(new ApiResponse(200, {}, 'Google login acknowledged (admin SDK unavailable)'));
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        let user = await User.findOne({ $or: [{ firebaseUid: userId }, { email: decodedToken.email }] });

        if (!user) {
            user = await User.create({
                name: decodedToken.name || 'Google User',
                email: decodedToken.email,
                firebaseUid: userId,
                avatar: decodedToken.picture || '',
                password: 'FIREBASE_AUTH_MANAGED',
                phone: '',
            });
        } else if (!user.firebaseUid) {
            user.firebaseUid = userId;
            await user.save({ validateBeforeSave: false });
        }

        res.json(new ApiResponse(200, {}, 'Google login synced'));
    } catch (error) {
        console.warn('[Google Login] Error:', error.message);
        res.json(new ApiResponse(200, {}, 'Google login acknowledged'));
    }
});

const getMongoUser = async (req) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    return req.user;
};

export const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('guardians', 'name email phone avatar')
        .select('-password');
    res.json(new ApiResponse(200, { user }, 'Profile retrieved'));
});

export const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, skills, isVulnerable } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (skills) updates.skills = skills;
    if (typeof isVulnerable === 'boolean') updates.isVulnerable = isVulnerable;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
    ).select('-password');

    res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

export const addGuardian = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Guardian email required');

    const guardian = await User.findOne({ email: email.toLowerCase() });
    if (!guardian) throw new ApiError(404, 'User not found');
    if (guardian._id.toString() === req.user._id.toString()) throw new ApiError(400, 'Cannot add yourself');

    const user = await User.findById(req.user._id);
    if (user.guardians.some(g => g.toString() === guardian._id.toString())) {
        throw new ApiError(400, 'Already a guardian');
    }

    user.guardians.push(guardian._id);
    user.isVulnerable = true;
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(req.user._id)
        .populate('guardians', 'name email phone avatar')
        .select('-password');

    res.json(new ApiResponse(200, { user: updatedUser }, 'Guardian added'));
});

export const removeGuardian = asyncHandler(async (req, res) => {
    const { guardianId } = req.params;
    const user = await User.findById(req.user._id);
    user.guardians = user.guardians.filter(g => g.toString() !== guardianId);
    if (user.guardians.length === 0) user.isVulnerable = false;
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(req.user._id)
        .populate('guardians', 'name email phone avatar')
        .select('-password');

    res.json(new ApiResponse(200, { user: updatedUser }, 'Guardian removed'));
});

export const getGuardians = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('guardians', 'name email phone avatar')
        .select('guardians isVulnerable');
    res.json(new ApiResponse(200, { guardians: user.guardians, isVulnerable: user.isVulnerable }, 'Guardians retrieved'));
});

export const getWards = asyncHandler(async (req, res) => {
    const wards = await User.find({ guardians: req.user._id }).select('name email phone avatar isVulnerable');
    res.json(new ApiResponse(200, { wards }, 'Wards retrieved'));
});
