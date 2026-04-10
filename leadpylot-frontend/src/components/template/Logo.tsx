import classNames from 'classnames';
import { APP_NAME } from '@/constants/app.constant';
import Image from 'next/image';
import type { CommonProps } from '@/@types/common';

interface LogoProps extends CommonProps {
  type?: 'full' | 'mini';
  mode?: 'light' | 'dark';
  imgClass?: string;
  logoWidth?: number;
  logoHeight?: number;
}

const LOGO_SRC_PATH = '/img/logo/';

const Logo = (props: LogoProps) => {
  const {
    type = 'full',
    mode = 'light',
    className,
    imgClass,
    style,
    logoWidth,
    logoHeight,
  } = props;

  const width = logoWidth || (type === 'full' ? 150 : 23);
  const height = logoHeight || (type === 'full' ? 23 : 23);

  return (
    <div className={classNames('logo', className)} style={style}>
      {mode === 'light' && (
        <>
          <Image
            className={classNames('', type === 'full' ? '' : 'hidden', imgClass)}
            src={`${LOGO_SRC_PATH}logo-full-black.png`}
            alt={`${APP_NAME} logo`}
            width={width}
            height={height}
            priority
          />
          <Image
            className={classNames('', type === 'mini' ? '' : 'hidden', imgClass)}
            src={`${LOGO_SRC_PATH}logo-mini-black.png`}
            alt={`${APP_NAME} logo`}
            width={width}
            height={height}
            priority
          />
        </>
      )}
      {mode === 'dark' && (
        <>
          <Image
            className={classNames(type === 'full' ? '' : 'hidden', imgClass)}
            src={`${LOGO_SRC_PATH}logo-full-white.png`}
            alt={`${APP_NAME} logo`}
            width={width}
            height={height}
            priority
          />
          <Image
            className={classNames(type === 'mini' ? '' : 'hidden', imgClass)}
            src={`${LOGO_SRC_PATH}logo-mini-white.png`}
            alt={`${APP_NAME} logo`}
            width={width}
            height={height}
            priority
          />
        </>
      )}
    </div>
  );
};

export default Logo;
