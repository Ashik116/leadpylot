import classNames from 'classnames';
import type { MouseEvent } from 'react';
import type { CommonProps } from '../@types/common';
import ApolloIcon from '../ApolloIcon';

interface NextProps extends CommonProps {
  currentPage: number;
  pageCount: number;
  pagerClass: {
    default: string;
    inactive: string;
    active: string;
    disabled: string;
  };
  onNext: (e: MouseEvent<HTMLSpanElement>) => void;
}

const Next = (props: NextProps) => {
  const { currentPage, pageCount, pagerClass, onNext } = props;

  const disabled = currentPage === pageCount || pageCount === 0;

  const onNextClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    if (disabled) {
      return;
    }
    onNext(e);
  };

  const pagerNextClass = classNames(
    'inline-flex h-6 min-w-6 items-center justify-center align-middle leading-none',
    pagerClass.default,
    'pagination-pager-next',
    disabled ? pagerClass.disabled : pagerClass.inactive
  );

  return (
    <span
      className={pagerNextClass}
      role="presentation"
      onClick={onNextClick}
    >
      <ApolloIcon
        name="chevron-arrow-right"
        className="pointer-events-none inline-flex items-center justify-center text-xl leading-none"
      />
    </span>
  );
};

export default Next;
