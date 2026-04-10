'use client';

import { useMemo } from 'react';
import isEmpty from 'lodash/isEmpty';

function useAuthority(userAuthority: string[] = [], authority: string[] = [], emptyCheck = false) {
  const roleMatched = useMemo(() => {
    // Early return for empty authority arrays
    if (isEmpty(authority) || isEmpty(userAuthority) || typeof authority === 'undefined') {
      return !emptyCheck;
    }

    // Check if any authority matches user authority
    return authority.some((role) => userAuthority.includes(role));
  }, [authority, userAuthority, emptyCheck]);

  return roleMatched;
}

export default useAuthority;
