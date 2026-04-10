import useAuthority from '@/utils/hooks/useAuthority';
import type { CommonProps } from '@/@types/common';

interface AuthorityCheckProps extends CommonProps {
  userAuthority: string[];
  authority: string[];
}

const AuthorityCheck = (props: AuthorityCheckProps) => {
  const { userAuthority = [], authority = [], children } = props;

  // Call the hook directly - it's already optimized internally
  const roleMatched = useAuthority(userAuthority, authority);

  return <>{roleMatched ? children : null}</>;
};

export default AuthorityCheck;
