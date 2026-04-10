// import { useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { checkTokenExpiration } from '@/utils/tokenExpirationUtils';

// /**
//  * Hook to check token expiration and log when expired
//  */
// export const useTokenExpirationCheck = () => {
//     const { data: session } = useSession();

//     useEffect(() => {
//         if (session?.user?.accessToken) {
//             // Check token expiration
//             checkTokenExpiration(session.user.accessToken);
//         }
//     }, [session?.user?.accessToken]);
// }; 