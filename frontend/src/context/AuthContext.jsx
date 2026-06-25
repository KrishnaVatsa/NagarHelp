import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Try to sync with backend, but don't block if it fails
                try {
                    const res = await fetch('/api/auth/sync-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid })
                    });
                    if (res.ok) {
                        const result = await res.json();
                        const role = result.data?.role || 'citizen';
                        setUserRole(role);
                        setCurrentUser({ ...user.toJSON(), ...result.data });
                    } else {
                        setUserRole('citizen');
                        setCurrentUser(user.toJSON());
                    }
                } catch (err) {
                    // Backend unavailable — set user from Firebase data
                    setUserRole('citizen');
                    setCurrentUser(user.toJSON());
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        // Safety timeout — if Firebase takes too long (e.g. no network), force load
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 8000);

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // ── Login: Firebase client auth ───────────────────────────────────────────
    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // ── Google Login ──────────────────────────────────────────────────────────
    const googleLogin = async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        // Sync with backend in background
        try {
            const idToken = await result.user.getIdToken();
            await fetch('/api/auth/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
        } catch (e) {
            console.warn('Backend Google sync failed (non-critical):', e.message);
        }
        return result;
    };

    // ── Register: Create in Firebase + backend ────────────────────────────────
    const register = async (userData) => {
        const { email, password, name, phone, role, address, city, department } = userData;

        // 1. Create in Firebase Auth (client-side, always works)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Firebase display name
        try {
            await updateProfile(user, { displayName: name });
        } catch (e) {
            console.warn('Profile update non-critical error:', e.message);
        }

        // 3. Register in backend MongoDB
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password: 'FIREBASE_AUTH', // Password managed by Firebase; store placeholder
                    phone,
                    role: role || 'citizen',
                    address,
                    city,
                    department,
                    firebaseUid: user.uid
                })
            });
            const data = await res.json();
            if (!res.ok) {
                console.warn('Backend registration warning:', data.message);
                // Don't throw — Firebase user was created, backend may have issue
            }
        } catch (backendErr) {
            console.warn('Backend registration failed (non-critical):', backendErr.message);
        }

        return { uid: user.uid, email, name };
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = () => signOut(auth);

    const value = {
        currentUser,
        role: userRole,
        isAuthenticated: !!currentUser,
        login,
        googleLogin,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}