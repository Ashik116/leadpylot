// /**
//  * Simple JWT Token Expiration Checker
//  */

// /**
//  * Decode JWT token without verification (for client-side use)
//  * @param token - JWT token string
//  * @returns Decoded token payload or null if invalid
//  */
// export const decodeToken = (token: string) => {
//     try {
//         const parts = token.split('.');
//         if (parts.length !== 3) {
//             return null;
//         }

//         const payload = parts[1];
//         const decodedPayload = JSON.parse(atob(payload));

//         return decodedPayload;
//     } catch {
//         return null;
//     }
// };

// /**
//  * Check if JWT token is expired and log if it is
//  * @param token - JWT token string
//  * @returns boolean indicating if token is expired
//  */
// export const checkTokenExpiration = (token: string): boolean => {
//     const decoded = decodeToken(token);
//     if (!decoded || !decoded.exp) {
//         return true;
//     }

//     const expirationDate = new Date(decoded.exp * 1000);
//     const isExpired = Date.now() >= expirationDate.getTime();
//     if (isExpired) {
//         console.log('🔴 Token expired');
//     }

//     return isExpired;
// }; 