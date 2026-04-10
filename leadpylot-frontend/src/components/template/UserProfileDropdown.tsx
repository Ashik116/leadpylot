'use client';

import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import withHeaderItem from '@/utils/hoc/withHeaderItem';
import Link from 'next/link';
import { PiSignOutDuotone } from 'react-icons/pi';
import { useAuth } from '@/hooks/useAuth';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import { useMemo } from 'react';
import TelegramPopoverItem, { type TelegramFormValues } from './TelegramPopoverItem';

import type { JSX } from 'react';
import ApolloIcon from '../ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';

type DropdownList = {
  label: string;
  path: string;
  icon: JSX.Element;
};

const dropdownItemList: DropdownList[] = [];

const UserDropdownBefore = () => {
  const { user, logout, profile, role } = useAuth();

  // Get blob URL for the profile image
  const { blobUrl: profileImageUrl } = useAttachmentPreviewFile(profile?.image_id?.id);

  const handleSignOut = () => {
    // Use simple logout for immedizate response - no API calls, no delays
    logout();
  };

  const avatarProps = {
    ...(profileImageUrl
      ? { src: profileImageUrl }
      : user?.avatar
        ? { src: user?.avatar }
        : { icon: <ApolloIcon name="user" /> }),
  };

  const telegramValue = useMemo<TelegramFormValues>(() => {
    const currentProfile = profile as any;

    return {
      telegram_username:
        (typeof currentProfile?.telegram_username === 'string'
          ? currentProfile.telegram_username
          : currentProfile?.info?.telegram_username) || '',
      telegram_phone:
        (typeof currentProfile?.telegram_phone === 'string'
          ? currentProfile.telegram_phone
          : currentProfile?.info?.telegram_phone) || '',
    };
  }, [profile]);

  return (
    <Dropdown
      className="flex"
      menuClass="w-80"
      toggleClassName="flex items-center"
      renderTitle={
        <div className="flex cursor-pointer items-center">
          <Avatar size={32} {...avatarProps} />
        </div>
      }
      placement="bottom-end"
    >
      <Dropdown.Item variant="header" className='px-2' style={{ height: 'auto' }}>
        {role === Role.ADMIN ? (
          <Link href="/profile" className="focus-visible:outline-none cursor-pointer">
            <div className="flex items-center gap-3  pt-2">
              <Avatar {...avatarProps} />
              <div>
                <div className="font-bold text-gray-900">{user?.name || 'Anonymous'}</div>
                <div className="text-xs">{user?.email || 'No email available'}</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3    py-1 ">
            <Avatar {...avatarProps} />
            <div>
              <div className="font-bold text-gray-900">{user?.name || 'Anonymous'}</div>
              <div className="text-xs">{user?.email || 'No email available'}</div>
            </div>
          </div>
        )}
      </Dropdown.Item>
      <TelegramPopoverItem value={telegramValue} />
      {/* <Dropdown.Item variant="divider" className="border" /> */}
      {dropdownItemList?.length > 0 ?
        dropdownItemList?.map((item) => (
          <Dropdown.Item key={item?.label} eventKey={item?.label} className="px-0">
            <Link className="flex h-full w-full px-2" href={item?.path}>
              <span className="flex w-full items-center gap-2">
                <span className="text-xl">{item?.icon}</span>
                <span>{item?.label}</span>
              </span>
            </Link>
          </Dropdown.Item>
        )) : ''}
      <Dropdown.Item
        eventKey="Sign Out"
        className="gap-2 border-t mt-1 border-gray-200 rounded-none"
        onClick={handleSignOut}
        disabled={false} // Removed isSigningOut state
      >
        <span className="text-xl">
          <PiSignOutDuotone />
        </span>
        <span>Sign Out</span>
      </Dropdown.Item>
    </Dropdown>
  );
};

const UserDropdown = withHeaderItem(UserDropdownBefore);

export default UserDropdown;
