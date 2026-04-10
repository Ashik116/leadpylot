import { ReactNode } from 'react';

export type ExtraHeader = string | ReactNode;

type TaskListHeaderProps = {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  extraHeaders?: ExtraHeader[];
};

const TaskListHeader = ({ headerHeight, rowWidth, extraHeaders = [] }: TaskListHeaderProps) => {
  return (
    <div className="table">
      <div
        className="bg:fill-gray-700/40 table-row list-none"
        style={{
          height: headerHeight,
        }}
      >
        <div
          className="table-cell px-3 align-middle"
          style={{
            minWidth: rowWidth,
          }}
        >
          &nbsp;Name
        </div>
        <div
          className="-ml-1 border-r border-gray-200"
          style={{
            height: headerHeight,
          }}
        />
      </div>
      {extraHeaders?.map((headers, index) => (
        <div
          key={`${headers}-${index}`}
          className="bg:fill-gray-700/40 table-row list-none"
          style={{
            height: headerHeight,
          }}
        >
          <div
            className="table-cell px-3 align-middle"
            style={{
              minWidth: rowWidth,
            }}
          >
            &nbsp;{headers}
          </div>
          <div
            className="-ml-1 border-r border-gray-200"
            style={{
              height: headerHeight,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default TaskListHeader;
