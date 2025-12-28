// hooks/useTransactionGuard.ts
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isMarketplaceActive } from '../lib/pivot';

export const useTransactionGuard = () => {
  const router = useRouter();
  
  // List of forbidden routes during pivot
  const FORBIDDEN_ROUTES = [
    '/checkout',
    '/cart',
    '/orders',
    '/shipping',
    '/payments'
  ];

  useEffect(() => {
    // If marketplace is disabled AND we are on a forbidden route
    if (!isMarketplaceActive() && FORBIDDEN_ROUTES.some(route => router.pathname.startsWith(route))) {
      console.warn('🚧 PIVOT GUARD: Transactional route accessed. Redirecting to home.');
      
      // Hard redirect to the new "Safe" home
      router.replace('/');
    }
  }, [router.pathname]);
};
