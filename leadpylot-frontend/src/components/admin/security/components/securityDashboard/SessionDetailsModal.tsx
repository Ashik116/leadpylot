'use client';

import CopyButton from '@/components/shared/CopyButton';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import React, { useState, useEffect } from 'react';
import {
  HiChevronDown,
  HiChevronRight,
  HiDevicePhoneMobile,
  HiFingerPrint,
  HiMapPin,
  HiShieldCheck,
} from 'react-icons/hi2';

interface SessionData {
  _id: string;
  userId: {
    _id: string;
    login: string;
    role: string;
  };
  sessionId: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  deviceInfo: {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    device: string | null;
    deviceType: string;
  };
  geolocation: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isp: string;
  };
  status: string;
  logoutTime: string | null;
  expiresAt: string;
  loginTime: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionData | null;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({ isOpen, onClose, session }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // Reset expanded sections when a new session is selected
  useEffect(() => {
    if (session) setExpandedSections(new Set(['overview']));
  }, [session?._id]);

  if (!session) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { class: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
      inactive: { class: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
      expired: { class: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    };
    return configs[status as keyof typeof configs] || configs.inactive;
  };

  const getBrowserIcon = (browser: string) => {
    const icons = { Chrome: '🌐', Firefox: '🦊', Safari: '🧭', Edge: '🌊', Opera: '🎭' };
    return icons[browser as keyof typeof icons] || '🌐';
  };

  const getOSIcon = (os: string) => {
    const icons = { Windows: '🪟', macOS: '🍎', Linux: '🐧', Android: '🤖', iOS: '📱' };
    return icons[os as keyof typeof icons] || '💻';
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const statusConfig = getStatusConfig(session.status);

  const CompactInfo = ({
    label,
    value,
    icon,
    copyable = false,
  }: {
    label: string;
    value: string | React.ReactNode;
    icon?: React.ReactNode;
    copyable?: boolean;
  }) => (
    <div className="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-gray-50">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-600">
        {icon && <span className="shrink-0 text-base">{icon}</span>}
        <span className="font-medium">{label}:</span>
      </div>
      <div className="ml-2 flex items-center gap-1">
        {typeof value === 'string' && copyable ? (
          <>
            <span className="max-w-32 truncate rounded bg-gray-100 px-2 py-0.5 text-right font-mono text-sm text-gray-900">
              {value}
            </span>
            <CopyButton value={value} />
          </>
        ) : (
          <span className="text-right text-sm text-gray-900">{value}</span>
        )}
      </div>
    </div>
  );

  const CollapsibleSection = ({
    id,
    title,
    icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between bg-gray-50 p-4 transition-colors hover:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-white p-1.5 shadow-sm">{icon}</div>
            <span className="font-semibold text-gray-900">{title}</span>
          </div>
          {isExpanded ? (
            <HiChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <HiChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {isExpanded && <div className="bg-white p-4">{children}</div>}
      </div>
    );
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width="800px">
      {/* Compact Header */}
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 py-2 pb-4">
        <div>
          <h2 className="flex items-center space-x-2 text-xl font-bold text-gray-900">
            <HiShieldCheck className="h-5 w-5 text-blue-600" />
            Session Details
            <span className="ml-1 text-sm font-medium text-gray-600">{session?.userId?.login}</span>
            <div className="flex items-center space-x-1">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {session?.userId?.role}
              </span>
              <div
                className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${statusConfig.class}`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${statusConfig?.dot}`}></div>
                <span className="font-medium capitalize">{session?.status}</span>
              </div>
            </div>
          </h2>
        </div>
      </div>

      {/* Compact Content */}
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        {/* Overview - Always Expanded */}
        <CollapsibleSection
          id="overview"
          title="Session Overview"
          icon={<HiShieldCheck className="h-4 w-4 text-blue-600" />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <CompactInfo label="Login" value={formatDate(session?.loginTime)} icon="🚪" />
              <CompactInfo
                label="Last Activity"
                value={formatDate(session?.lastActivity)}
                icon="⚡"
              />
            </div>
            <div className="space-y-1">
              <CompactInfo label="Expires" value={formatDate(session?.expiresAt)} icon="⏰" />
              <CompactInfo
                label="Session ID"
                value={session?.sessionId?.slice(0, 12) + '...'}
                copyable
                icon="🔑"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Device & Network - Compact View */}
        <CollapsibleSection
          id="device"
          title="Device & Network"
          icon={<HiDevicePhoneMobile className="h-4 w-4 text-green-600" />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <CompactInfo
                label="Browser"
                value={
                  <div className="flex items-center gap-1">
                    {session?.deviceInfo?.browser ? (
                      <>
                        <span>{getBrowserIcon(session?.deviceInfo?.browser)}</span>
                        <span>
                          {session?.deviceInfo?.browser}{' '}
                          {session?.deviceInfo?.browserVersion?.split('.')[0]}
                        </span>
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                }
              />
              <CompactInfo
                label="OS"
                value={
                  <div className="flex items-center gap-1">
                    {session?.deviceInfo?.os ? (
                      <>
                        <span>{getOSIcon(session?.deviceInfo?.os)}</span>
                        <span>
                          {session?.deviceInfo?.os} {session?.deviceInfo?.osVersion}
                        </span>
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                }
              />
              <CompactInfo label="Device" value={session?.deviceInfo?.deviceType} icon="📱" />
            </div>
            <div className="space-y-1">
              <CompactInfo label="IP Address" value={session?.ipAddress} copyable icon="🌐" />
              <CompactInfo
                label="Location"
                value={`${session?.geolocation?.city}, ${session?.geolocation?.countryCode}`}
                icon="📍"
              />
              <CompactInfo
                label="Timezone"
                value={
                  session?.geolocation?.timezone?.split('/')[1] || session?.geolocation?.timezone
                }
                icon="🌍"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Location Map */}
        <CollapsibleSection
          id="location"
          title="Location Map"
          icon={<HiMapPin className="h-4 w-4 text-red-600" />}
        >
          <div className="space-y-3">
            <div className="h-48 overflow-hidden rounded-lg bg-gray-100">
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${session?.geolocation?.latitude},${session?.geolocation?.longitude}&zoom=11`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4">
                  <HiMapPin className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-3 text-sm text-gray-600">Maps API key not configured</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${session?.geolocation?.latitude},${session?.geolocation?.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    🗺️ Open in Google Maps
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-between rounded bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <span>
                📍 {session?.geolocation?.latitude}, {session?.geolocation?.longitude}
              </span>
              <span>🏢 {session?.geolocation?.isp?.slice(0, 30)}...</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Technical Details */}
        <CollapsibleSection
          id="technical"
          title="Technical Details"
          icon={<HiFingerPrint className="h-4 w-4 text-orange-600" />}
        >
          <div className="space-y-3">
            <CompactInfo
              label="Device Fingerprint"
              value={session?.deviceFingerprint}
              copyable
              icon="🔍"
            />
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">User Agent</span>
                <CopyButton value={session?.userAgent} />
              </div>
              <p className="font-mono text-xs leading-relaxed break-all text-gray-600">
                {session?.userAgent}
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Compact Footer */}
      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
};

export default SessionDetailsModal;
