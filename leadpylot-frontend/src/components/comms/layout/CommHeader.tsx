'use client';

import { useState } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useChannels } from '@/services/hooks/comm';
import { Hash, Volume2, Video, Users, Phone, Search, Pin, Bell, HelpCircle, Menu, BarChart3 } from 'lucide-react';
import type { ChannelType } from '@/types/comm.types';
import LiveKitMonitor from '../monitoring/LiveKitMonitor';

const headerIcons: Record<ChannelType, React.ReactNode> = {
  text: <Hash size={24} className="shrink-0 text-[#80848e]" />,
  voice: <Volume2 size={24} className="shrink-0 text-[#80848e]" />,
  video: <Video size={24} className="shrink-0 text-[#80848e]" />,
};

function MobileMenuButton() {
  const toggleMobileSidebar = useCommStore((s) => s.toggleMobileSidebar);
  return (
    <button
      onClick={toggleMobileSidebar}
      className="mr-2 rounded p-1 text-[#b5bac1] hover:text-[#dbdee1] transition-colors md:hidden"
      title="Open sidebar"
    >
      <Menu size={22} />
    </button>
  );
}

export default function CommHeader() {
  const { view, activeServerId, activeChannelId, activeDMId, memberSidebarOpen, toggleMemberSidebar } = useCommStore();
  const { data: channels = [] } = useChannels(activeServerId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const [showMonitor, setShowMonitor] = useState(false);

  if (view === 'dm' && activeDMId) {
    return (
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#1f2023] bg-[#313338] px-3 md:px-4 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <MobileMenuButton />
        <span className="text-base font-semibold text-[#f2f3f5]">Direct Message</span>
        <div className="flex-1" />
        <HeaderButton icon={<Phone size={20} />} title="Start Voice Call" />
        <HeaderButton icon={<Video size={20} />} title="Start Video Call" />
      </div>
    );
  }

  if (!activeChannel) {
    return (
      <div className="flex h-12 shrink-0 items-center border-b border-[#1f2023] bg-[#313338] px-3 md:px-4 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <MobileMenuButton />
        <span className="text-base text-[#949ba4]">Select a channel</span>
      </div>
    );
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#1f2023] bg-[#313338] px-3 md:px-4 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <MobileMenuButton />
      {headerIcons[activeChannel.type]}
      <span className="truncate text-base font-semibold text-[#f2f3f5]">{activeChannel.name}</span>
      {activeChannel.topic && (
        <>
          <div className="mx-2 hidden sm:block h-6 w-px bg-[#3f4147]" />
          <span className="hidden sm:block truncate text-sm text-[#949ba4]">{activeChannel.topic}</span>
        </>
      )}
      <div className="flex-1" />

      <div className="flex items-center gap-0.5 sm:gap-1">
        <span className="hidden sm:block"><HeaderButton icon={<Pin size={20} />} title="Pinned Messages" /></span>
        <span className="hidden sm:block"><HeaderButton icon={<Bell size={20} />} title="Notification Settings" /></span>
        <HeaderButton
          icon={<Users size={20} />}
          title="Toggle Member List"
          active={memberSidebarOpen}
          onClick={toggleMemberSidebar}
        />
        <HeaderButton
          icon={<BarChart3 size={20} />}
          title="Server Monitor"
          active={showMonitor}
          onClick={() => setShowMonitor(true)}
        />
        <span className="hidden md:block"><HeaderButton icon={<HelpCircle size={20} />} title="Help" /></span>
        <div className="relative ml-1 hidden sm:block">
          <input
            type="text"
            placeholder="Search"
            className="h-6 w-28 md:w-36 rounded bg-[#1e1f22] px-2 text-[13px] text-[#dbdee1] placeholder-[#949ba4] outline-none focus:w-44 md:focus:w-56 transition-all"
          />
        </div>
        <span className="sm:hidden"><HeaderButton icon={<Search size={20} />} title="Search" /></span>
      </div>

      {showMonitor && <LiveKitMonitor onClose={() => setShowMonitor(false)} />}
    </div>
  );
}

function HeaderButton({ icon, title, active, onClick }: { icon: React.ReactNode; title: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded p-1 transition-colors ${
        active ? 'text-[#dbdee1]' : 'text-[#b5bac1] hover:text-[#dbdee1]'
      }`}
      title={title}
    >
      {icon}
    </button>
  );
}
