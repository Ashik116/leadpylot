'use client';

interface Props {
  date: string;
}

export default function DateDivider({ date }: Props) {
  return (
    <div className="my-4 flex items-center gap-2">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[11px] font-semibold text-white/25">{date}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
