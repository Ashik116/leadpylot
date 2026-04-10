const TYPE_BG_CLASS: Record<string, string> = {
  custom: 'bg-red-500/10 text-red-700',
  offer: 'bg-orange-500/10 text-orange-700',
  opening: 'bg-blue-500/10 text-blue-700',
  email: 'bg-green-500/10 text-green-700',
  lead: 'bg-purple-500/10 text-purple-700',
};

const TaskTypeBadge = ({ taskType }: { taskType: string }) => {
  const normalizedType = (taskType || '').toLowerCase().trim();
  const bgClass = TYPE_BG_CLASS[normalizedType] || 'bg-ocean-2';

  return (

    <span className={`${bgClass} min-w-10 text-center py-1 rounded-xs px-1.5  text-xs leading-none font-medium`}>
      {taskType}
    </span>

  );
};

export default TaskTypeBadge;