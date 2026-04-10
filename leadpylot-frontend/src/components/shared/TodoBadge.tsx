'use client';
const TodoBadge = ({ todoCount }: { todoCount: number }) => {
  return (
    <div className="flex size-4 items-center justify-center rounded-full bg-amber-600 text-center text-sm text-white">
      {todoCount}
    </div>
  );
};

export default TodoBadge;
