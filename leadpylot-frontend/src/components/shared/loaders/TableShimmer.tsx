import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import Table from '@/components/ui/Table';
import ScrollBar from '@/components/ui/ScrollBar';
import Card from '@/components/ui/Card';
import type { SkeletonProps } from '@/components/ui/Skeleton';

type TableShimmerProps = {
  rows?: number;
  showHeader?: boolean;
  showCard?: boolean;
  className?: string;
  avatarProps?: SkeletonProps;
  headers?: string[];
  cardTitle?: string;
  cardButtonText?: string;
};

const { Tr, Th, Td, THead, TBody } = Table;

// Helper function to generate skeleton content based on column type
const getColumnSkeletonContent = (
  headerName: string,
  columnIndex: number,
  avatarProps?: SkeletonProps
) => {
  // Actions column - show circular button skeletons
  if (headerName.includes('action')) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" width="32px" height="32px" {...avatarProps} />
        <Skeleton variant="circle" width="32px" height="32px" {...avatarProps} />
      </div>
    );
  }

  // Default column - standard text content
  return (
    <div className="flex items-center gap-3">
      <Skeleton width="120px" height="16px" />
    </div>
  );
};

// TableContent component moved outside to avoid creating during render
const TableContent: React.FC<{
  rows: number;
  showHeader: boolean;
  className: string;
  avatarProps?: SkeletonProps;
  headers: string[];
  cardTitle?: string;
  cardButtonText?: string;
}> = ({ rows, showHeader, className, avatarProps, headers, cardTitle, cardButtonText }) => (
  <ScrollBar>
    <div className="min-w-max">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton width={cardTitle ? `${cardTitle.length * 8 + 40}px` : '120px'} height="24px" />
        <Skeleton
          width={cardButtonText ? `${cardButtonText.length * 8 + 60}px` : '100px'}
          height="36px"
        />
      </div>
      <Table className={className}>
        {showHeader && (
          <THead>
            <Tr>
              {headers.map((header, index) => (
                <Th key={index}>
                  <Skeleton width="60px" height="16px" />
                </Th>
              ))}
            </Tr>
          </THead>
        )}
        <TBody>
          {Array.from(new Array(rows), (_, i) => i).map((row) => (
            <Tr key={`shimmer-row-${row}`}>
              {headers.map((header, colIndex) => (
                <Td key={`col-${colIndex}`}>
                  {getColumnSkeletonContent(header.toLowerCase(), colIndex, avatarProps)}
                </Td>
              ))}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  </ScrollBar>
);

const TableShimmer = (props: TableShimmerProps) => {
  const {
    rows = 8,
    showHeader = true,
    showCard = true,
    className = '',
    avatarProps,
    headers = ['Name', 'Details', 'Actions'],
    cardTitle,
    cardButtonText,
  } = props;

  const content = (
    <TableContent
      rows={rows}
      showHeader={showHeader}
      className={className}
      avatarProps={avatarProps}
      headers={headers}
      cardTitle={cardTitle}
      cardButtonText={cardButtonText}
    />
  );

  if (showCard) {
    return <Card>{content}</Card>;
  }

  return content;
};

export default TableShimmer;
