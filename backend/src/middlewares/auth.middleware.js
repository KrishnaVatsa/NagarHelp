import { verifyFirebaseToken } from './firebaseAuth.middleware.js';
import { ApiError } from '../utils/ApiError.js';


export const verifyJWT = verifyFirebaseToken;
export const authenticate = verifyFirebaseToken;

export const authorize = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new ApiError(401, 'Unauthorized'));
            }
            
            if (!roles.includes(req.user.role)) {
                return next(new ApiError(403, 'Forbidden: Insufficient privileges'));
            }
            
            next();
        } catch (error) {
            next(new ApiError(500, error.message));
        }
    };
};
