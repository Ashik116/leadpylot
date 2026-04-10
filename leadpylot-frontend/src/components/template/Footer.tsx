import Container from '@/components/shared/Container';
import classNames from '@/utils/classNames';
import { APP_NAME } from '@/constants/app.constant';
import { PAGE_CONTAINER_GUTTER_X } from '@/constants/theme.constant';
import Link from 'next/link';

export type FooterPageContainerType = 'gutterless' | 'contained';

type FooterProps = {
  pageContainerType: FooterPageContainerType;
  className?: string;
};

const FooterContent = () => {
  return (
    <div className="text-sand-2 flex w-full flex-wrap items-center justify-between">
      <span>
        Copyright &copy; {`${new Date().getFullYear()}`}{' '}
        <span className="font-semibold">{`${APP_NAME}`}</span> All rights reserved.
      </span>
      <div className="flex w-full justify-center sm:w-fit">
        <Link href="/#" onClick={(e) => e.preventDefault()}>
          Term & Conditions
        </Link>
        <span className="mx-2"> | </span>
        <Link href="/#" onClick={(e) => e.preventDefault()}>
          Privacy & Policy
        </Link>
      </div>
    </div>
  );
};

export default function Footer({ pageContainerType = 'contained', className }: FooterProps) {
  return (
    <footer
      className={classNames(
        `footer flex h-16 flex-auto items-center ${PAGE_CONTAINER_GUTTER_X} px-4`,
        className
      )}
    >
      {pageContainerType === 'contained' ? (
        <Container>
          <FooterContent />
        </Container>
      ) : (
        <FooterContent />
      )}
    </footer>
  );
}
