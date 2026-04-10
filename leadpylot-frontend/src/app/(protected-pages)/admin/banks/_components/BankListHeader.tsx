interface BankListHeaderProps {
  /** Number of columns in the grid (3 for BankList, 4 for admin dashboard) */
  columnCount?: 3 | 4;
  /** Left column label (e.g. "Info", "Name") */
  leftLabel?: string;
  /** Right column label (e.g. "Allow", "Limits") */
  rightLabel?: string;
}

const BankListHeader = ({
  columnCount = 4,
  leftLabel = 'Info',
  rightLabel,
}: BankListHeaderProps) => {
  const gridClass =
    columnCount === 3
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  return (
    <div
      className={`sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 shadow-sm ${gridClass}`}
    >
      {Array(columnCount)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            className={`flex justify-between text-gray-500 ${i === 0 ? '' : i < 2 ? 'hidden md:flex' : 'hidden xl:flex'}`}
          >
            <div className="px-2 text-left">{leftLabel}</div>
            {rightLabel && <div className="border-r border-gray-300 px-2 text-center">{rightLabel}</div>}
          </div>
        ))}
    </div>
  );
};

export default BankListHeader;
