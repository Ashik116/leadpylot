'use client';

import { useCommStore } from '@/stores/commStore';
import { useUserProfiles } from '@/services/hooks/comm';

export default function TypingIndicator() {
  const { activeChannelId, typingUsers, userProfiles } = useCommStore();
  const typing = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  // Fetch profiles for typing users
  useUserProfiles(typing);

  if (typing.length === 0) return <div className="h-6 px-4" />;

  const getName = (userId: string) => userProfiles[userId]?.username || userId.slice(-6);

  const text =
    typing.length === 1
      ? `${getName(typing[0])} is typing...`
      : typing.length === 2
      ? `${getName(typing[0])} and ${getName(typing[1])} are typing...`
      : `${typing.length} people are typing...`;

  return (
    <div className="flex h-6 items-center gap-2 px-4 text-[11px] text-white/40">
      <div className="flex gap-0.5">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:200ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:400ms]" />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
