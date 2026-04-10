'use client';

import ActionLink from '@/components/shared/ActionLink';
import Logo from '@/components/template/Logo';
import Alert from '@/components/ui/Alert';
import useTheme from '@/utils/hooks/useTheme';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import type { OnSignIn } from './SignInForm';
import SignInForm from './SignInForm';
import AuthentikLoginButton from './AuthentikLoginButton';

type SignInProps = {
  forgetPasswordUrl?: string;
  onSignIn?: OnSignIn;
  /** Post-SSO return path when SSO is enabled (should be a safe in-app path). */
  ssoRedirectTo?: string;
};

const SignIn = ({
  forgetPasswordUrl = '/forgot-password',
  onSignIn,
  ssoRedirectTo,
}: SignInProps) => {
  const [message, setMessage] = useTimeOutMessage();

  const mode = useTheme((state) => state.mode);

  return (
    <>
      <div className="mb-8">
        <Logo type="mini" mode={mode} logoWidth={60} logoHeight={60} />
      </div>
      <div className="mb-10">
        <h2 className="mb-2">Welcome back!</h2>
        <p className="heading-text font-semibold">Please enter your credentials to sign in!</p>
      </div>
      {message && (
        <Alert showIcon className="mb-4" type="danger">
          <span className="break-all">{message}</span>
        </Alert>
      )}
      <SignInForm
        setMessage={setMessage}
        passwordHint={
          <div className="mt-2 mb-7">
            <ActionLink
              href={forgetPasswordUrl}
              className="heading-text mt-2 font-semibold underline"
              themeColor={false}
            >
              Forgot password
            </ActionLink>
          </div>
        }
        onSignIn={onSignIn}
      />
      {/* Authentik SSO Login - Shows automatically if configured */}
      <AuthentikLoginButton redirectTo={ssoRedirectTo ?? '/'} />
    </>
  );
};

export default SignIn;
