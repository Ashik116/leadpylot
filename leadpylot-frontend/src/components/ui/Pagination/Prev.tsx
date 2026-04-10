import classNames from 'classnames';
import type { MouseEvent } from 'react';
import type { CommonProps } from '../@types/common';
import ApolloIcon from '../ApolloIcon';

interface PrevProps extends CommonProps {
  currentPage: number;
  pagerClass: {
    default: string;
    inactive: string;
    active: string;
    disabled: string;
  };
  onPrev: (e: MouseEvent<HTMLSpanElement>) => void;
}

const Prev = (props: PrevProps) => {
  const { currentPage, pagerClass, onPrev } = props;

  const disabled = currentPage <= 1;

  const onPrevClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (disabled) {
      return;
    }
    onPrev(e);
  };

  const pagerPrevClass = classNames(
    'inline-flex h-6 min-w-6 items-center justify-center align-middle leading-none',
    pagerClass?.default,
    'pagination-pager-prev',
    disabled ? pagerClass?.disabled : pagerClass?.inactive
  );

  return (
    <span
      className={pagerPrevClass}
      role="presentation"
      onClick={onPrevClick}
    >
      <ApolloIcon
        name="chevron-arrow-left"
        className="pointer-events-none inline-flex items-center justify-center text-xl leading-none"
      />
    </span>
  );
};

export default Prev;
