import classNames from '@/utils/classNames';
import { TbChevronRight, TbChevronDown } from 'react-icons/tb';
import type { Task } from 'gantt-task-react';
import type { ReactNode } from 'react';

type ExtendedTask = Task & { barVariant?: string };

export type ExtraCell = (task: ExtendedTask) => ReactNode | string;

type TaskListTableProps = {
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: ExtendedTask[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: Task) => void;
  extraCells?: ExtraCell[];
};

const TaskListTable = ({
  rowHeight,
  rowWidth,
  tasks,
  onExpanderClick,
  extraCells,
}: TaskListTableProps) => {
  return (
    <div className="table">
      {tasks?.map((t, rowIndex) => {
        return (
          <div key={`${t?.id}row`} className="_34SS0" style={{ height: rowHeight }}>
            <div
              className="table-cell overflow-hidden border-r border-gray-200 px-2 align-middle text-ellipsis whitespace-nowrap"
              style={{
                minWidth: rowWidth,
                maxWidth: rowWidth,
              }}
              title={t?.name}
            >
              <div className="flex items-center gap-1">
                <div
                  className="min-w-4 cursor-pointer text-lg"
                  role="button"
                  onClick={() => onExpanderClick(t)}
                >
                  {t?.hideChildren === false && <TbChevronDown />}
                  {t?.hideChildren === true && <TbChevronRight />}
                </div>
                <div
                  className={classNames(
                    'truncate',
                    typeof t?.hideChildren === 'boolean' && 'heading-text font-bold'
                  )}
                >
                  {t?.name}
                </div>
              </div>
            </div>
            {extraCells?.map((cell, cellIndex) => (
              <div
                key={`${t?.id}-cell-${rowIndex}-${cellIndex}`}
                className="table-cell overflow-hidden border-r border-gray-200 px-2 align-middle text-ellipsis whitespace-nowrap"
                style={{
                  minWidth: rowWidth,
                  maxWidth: rowWidth,
                }}
              >
                &nbsp;{cell(t)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TaskListTable;
