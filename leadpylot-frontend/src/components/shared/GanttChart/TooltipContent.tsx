import Progress from '@/components/ui/Progress';
import { TbClock } from 'react-icons/tb';
import dayjs from 'dayjs';
import type { Task } from 'gantt-task-react';

type TooltipContentProps = {
  task: Task;
};

const progressBarStatusClass = (progression: number) => {
  if (progression > 70) {
    return 'bg-evergreen';
  }

  if (progression < 40) {
    return 'bg-rust';
  }

  return;
};

const TooltipContent = (props: TooltipContentProps) => {
  const { task } = props;

  return (
    <div className="z-10 flex min-w-[200px] items-center justify-between rounded-lg bg-gray-800 p-3 shadow-sm">
      <div className="flex w-full flex-col">
        <div className="mb-1 font-bold text-white">{task?.name}</div>
        <div className="flex items-center gap-1 text-gray-300">
          <TbClock className="text-lg" />
          <span>
            {dayjs(task?.start).format('DD')} ~ {dayjs(task?.end).format('DD MMM')}
          </span>
        </div>
        <div>
          {!!task?.progress && (
            <Progress
              customColorClass={progressBarStatusClass(task?.progress)}
              className="text-white"
              percent={task?.progress}
              trailClass="bg-gray-500"
              customInfo={<div className="font-bold text-white">{task?.progress}%</div>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TooltipContent;
