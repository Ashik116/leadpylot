import classNames from 'classnames';
import {
  BsFillCaretDownFill,
  BsFillCaretLeftFill,
  BsFillCaretUpFill,
  BsFillCaretRightFill,
} from 'react-icons/bs';

export type ArrowPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end';

interface ArrowProps {
  placement: ArrowPlacement;
  color: string;
}

const Arrow = ({ placement, color }: ArrowProps) => {
  const arrowDefaultClass = `absolute ${color}`;

  const getArrow = () => {
    switch (placement) {
      case 'top':
        return (
          <BsFillCaretDownFill
            className={classNames(arrowDefaultClass, '-bottom-2 left-0 w-full')}
          />
        );
      case 'top-start':
        return (
          <BsFillCaretDownFill className={classNames(arrowDefaultClass, '-bottom-2 left-0 ml-3')} />
        );
      case 'top-end':
        return (
          <BsFillCaretDownFill
            className={classNames(arrowDefaultClass, 'right-0 -bottom-2 mr-3')}
          />
        );
      case 'right':
        return (
          <BsFillCaretLeftFill
            className={classNames(arrowDefaultClass, 'top-1/2 -left-2 -translate-y-1/2 transform')}
          />
        );
      case 'right-start':
        return <BsFillCaretLeftFill className={classNames(arrowDefaultClass, 'top-2 -left-2')} />;
      case 'right-end':
        return (
          <BsFillCaretLeftFill className={classNames(arrowDefaultClass, 'bottom-2 -left-2')} />
        );
      case 'bottom':
        return (
          <BsFillCaretUpFill className={classNames(arrowDefaultClass, '-top-2 left-0 w-full')} />
        );
      case 'bottom-start':
        return (
          <BsFillCaretUpFill className={classNames(arrowDefaultClass, '-top-2 left-0 ml-3')} />
        );
      case 'bottom-end':
        return (
          <BsFillCaretUpFill className={classNames(arrowDefaultClass, '-top-2 right-0 mr-3')} />
        );
      case 'left':
        return (
          <BsFillCaretRightFill
            className={classNames(arrowDefaultClass, 'top-1/2 -right-2 -translate-y-1/2 transform')}
          />
        );
      case 'left-start':
        return <BsFillCaretRightFill className={classNames(arrowDefaultClass, 'top-2 -right-2')} />;
      case 'left-end':
        return (
          <BsFillCaretRightFill className={classNames(arrowDefaultClass, '-right-2 bottom-2')} />
        );
      default:
        break;
    }
  };

  return <div>{getArrow()}</div>;
};

export default Arrow;
