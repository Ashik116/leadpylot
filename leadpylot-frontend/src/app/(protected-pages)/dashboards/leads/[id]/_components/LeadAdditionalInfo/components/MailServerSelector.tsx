import React, { useMemo } from 'react';
import Select from '@/components/ui/Select';

type SelectOption = {
  value: string;
  label: string;
};

interface MailServerSelectorProps {
  selectedMailServer: string;
  onMailServerChange: (serverId: string) => void;
  isLoadingServers: boolean;
  servers: any;
}

export const MailServerSelector: React.FC<MailServerSelectorProps> = ({
  selectedMailServer,
  onMailServerChange,
  isLoadingServers,
  servers,
}) => {
  const mailServerOptions = useMemo<SelectOption[]>(
    () =>
      (servers?.data || servers || []).map((server: any) => ({
        value: server._id,
        label: server.name,
      })),
    [servers]
  );

  const selectedMailServerOption = useMemo(
    () => mailServerOptions.find((option) => option.value === selectedMailServer) || null,
    [mailServerOptions, selectedMailServer]
  );

  return (
    <div className="w-full min-w-0 [&_.select-control]:rounded-lg">
      <label className="mb-0.5 block text-xs font-medium tracking-wide  capitalize">
        Mail Server
      </label>
      <Select
        placeholder="Select a mail server"
        isDisabled={isLoadingServers}
        value={selectedMailServerOption}
        onChange={(option) => onMailServerChange(option?.value || '')}
        options={mailServerOptions}
      />
    </div>
  );
};

