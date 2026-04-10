/**
 * Hook to sync ALL agent extensions with AMI service
 * This ensures the admin dashboard shows all extensions the agent is connected to
 */

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { apiUpdateMyExtension } from '@/services/MonitoringService';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { isDev } from '@/utils/utils';
import { useAgentAllExtensions } from './useAgentAllExtensions';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';

export const useMultiExtensionSync = (connectedExtensions: string[]) => {
  const { data: session } = useSession();
  const { allExtensions } = useAgentAllExtensions();
  const { selectedProject } = useSelectedProjectStore();
  const syncedExtensionsRef = useRef<string[]>([]);
  const isInitializedRef = useRef(false);
  const lastSelectedExtensionRef = useRef<string | null>(null);
  const [syncedExtensions, setSyncedExtensions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);

  useEffect(() => {
    // Only sync for agents, not admins
    if (session?.user?.role !== Role.AGENT) {
      return;
    }

    if (!allExtensions.length || !connectedExtensions.length) {
      return;
    }

    // Skip initial load to avoid unnecessary calls
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      syncedExtensionsRef.current = [...connectedExtensions];
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setIsInitialized(true);
        setSyncedExtensions([...connectedExtensions]);
      }, 0);
      return () => clearTimeout(timeoutId);

      isDev &&
        console.log('🔄 Multi-Extension Sync: Initialized with extensions:', connectedExtensions);
      return;
    }

    // Check if connected extensions changed
    const previousExtensions = syncedExtensionsRef.current;
    const hasChanged =
      connectedExtensions.length !== previousExtensions.length ||
      connectedExtensions.some((ext) => !previousExtensions.includes(ext)) ||
      previousExtensions.some((ext) => !connectedExtensions.includes(ext));

    if (!hasChanged) {
      return;
    }

    // Sync all connected extensions with AMI service
    const syncAllExtensions = async () => {
      isDev &&
        console.log('🔄 Multi-Extension Sync: Syncing extensions with AMI service:', {
          previously: previousExtensions,
          now: connectedExtensions,
          agent: session.user.name,
        });

      const syncResults: Array<{ extension: string; success: boolean; error?: any }> = [];

      // Register each connected extension with AMI service
      for (const extension of connectedExtensions) {
        try {
          const extensionInfo = allExtensions.find((ext) => ext.extension === extension);

          isDev &&
            console.log(
              `📞 Registering extension ${extension} with AMI service (${extensionInfo?.projectName || 'Unknown Project'})...`
            );

          await apiUpdateMyExtension({
            extension: extension,
          });

          syncResults.push({ extension, success: true });

          // eslint-disable-next-line no-console
          isDev && console.log(`✅ Successfully registered ${extension} with AMI service`);

          // Small delay between registrations
          if (connectedExtensions.indexOf(extension) < connectedExtensions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Failed to register extension ${extension} with AMI service:`, error);
          syncResults.push({ extension, success: false, error });
        }
      }

      // Update synced extensions reference
      syncedExtensionsRef.current = [...connectedExtensions];
      setSyncedExtensions([...connectedExtensions]);

      // Report results
      const successful = syncResults.filter((r) => r.success);
      const failed = syncResults.filter((r) => !r.success);

      isDev &&
        console.log(
          `🎯 Multi-Extension Sync Results: ${successful.length}/${connectedExtensions.length} extensions synced`
        );

      if (successful.length > 0) {
        isDev &&
          console.log(
            `✅ AMI service updated for extensions:`,
            successful.map((r) => r.extension).join(', ')
          );
      }

      if (failed.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️ AMI sync failed for extensions:`,
          failed.map((r) => r.extension).join(', ')
        );
      }

      if (successful.length === connectedExtensions.length) {
        isDev &&
          console.log(
            `🎉 FULL AMI SYNC: Admin dashboard should now see agent connected to ALL ${connectedExtensions.length} extensions!`
          );
      }
    };

    syncAllExtensions();
  }, [
    session?.user?.role,
    session?.user?.name,
    session?.user?.id,
    allExtensions,
    connectedExtensions,
  ]);

  // Separate effect to handle project selection changes
  useEffect(() => {
    // Only for agents
    if (session?.user?.role !== Role.AGENT) {
      return;
    }

    if (!selectedProject?.agents?.[0]?.voip_username) {
      return;
    }

    const selectedProjectExtension = selectedProject.agents[0].voip_username;

    // Skip if this is the same extension as before
    if (lastSelectedExtensionRef.current === selectedProjectExtension) {
      return;
    }

    // Update selected extension with backend
    const updateSelectedExtension = async () => {
      try {
        isDev &&
          console.log('🎯 Multi-Extension Sync: Updating selected extension', {
            agent: session.user.name,
            previousSelected: lastSelectedExtensionRef.current,
            newSelected: selectedProjectExtension,
            project: selectedProject.name,
          });

        await apiUpdateMyExtension({
          extension: selectedProjectExtension,
        });

        lastSelectedExtensionRef.current = selectedProjectExtension;
        setSelectedExtension(selectedProjectExtension);

        isDev &&
          console.log(
            '✅ Selected extension updated successfully - admin dashboard will now highlight this extension'
          );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Failed to update selected extension:', error);
      }
    };

    updateSelectedExtension();
  }, [session?.user?.role, session?.user?.name, selectedProject]);

  return {
    syncedExtensions,
    isInitialized,
    selectedExtension,
  };
};
