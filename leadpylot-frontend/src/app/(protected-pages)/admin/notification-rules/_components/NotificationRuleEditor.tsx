'use client';

import { useState, useRef, useEffect, createElement } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import Switcher from '@/components/ui/Switcher';
import Select from '@/components/ui/Select';
import FormItem from '@/components/ui/Form/FormItem';
import { HiOutlineSave, HiOutlineBell, HiOutlineUserGroup, HiOutlineMail, HiOutlineMusicNote, HiOutlineTrash, HiOutlinePlay, HiOutlineX } from 'react-icons/hi';
import { useUpdateNotificationRule, useUploadNotificationRuleAudio, useDeleteNotificationRuleAudio, useNotificationRule } from '@/services/hooks/useNotificationRules';
import type { NotificationRule, UpdateRulePayload } from '@/services/NotificationRulesService';
import audioService from '@/utils/audioUtils';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface NotificationRuleEditorProps {
  rule: NotificationRule;
  onClose: () => void;
}

// Available roles
const AVAILABLE_ROLES = ['Admin', 'Agent', 'Provider'];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
];

export const NotificationRuleEditor = ({ rule: initialRule, onClose }: NotificationRuleEditorProps) => {
  // Fetch the latest rule data (will auto-update when cache is invalidated)
  const { data: latestRuleData } = useNotificationRule(initialRule._id);
  
  // Use latest rule data if available, otherwise use initial rule
  const rule = latestRuleData || initialRule;

  // Form state
  const [formData, setFormData] = useState({
    displayName: rule.displayName,
    description: rule.description || '',
    enabled: rule.enabled,
    priority: rule.priority,
    recipients: {
      roles: [...rule.recipients.roles],
      dynamicTargets: { ...rule.recipients.dynamicTargets },
      excludeCreator: rule.recipients.excludeCreator,
    },
    channels: { ...rule.channels },
    customTitle: rule.customTitle || '',
    customMessage: rule.customMessage || '',
  });

  // Track audio ID to detect changes
  const audioIdRef = useRef<string | null>(null);
  // Track if we just uploaded audio to auto-play it
  const justUploadedAudioRef = useRef<boolean>(false);

  const updateRule = useUpdateNotificationRule();
  const uploadAudio = useUploadNotificationRuleAudio();
  const deleteAudio = useDeleteNotificationRuleAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio preview state - declare before useEffect that uses them
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isPlayingExisting, setIsPlayingExisting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize form data only once when component mounts or rule ID changes
  useEffect(() => {
    // Only update form data if it's a different rule (rule ID changed)
    // This prevents resetting form when user is editing
    if (rule._id !== initialRule._id) {
      setFormData({
        displayName: rule.displayName,
        description: rule.description || '',
        enabled: rule.enabled,
        priority: rule.priority,
        recipients: {
          roles: [...rule.recipients.roles],
          dynamicTargets: { ...rule.recipients.dynamicTargets },
          excludeCreator: rule.recipients.excludeCreator,
        },
        channels: { ...rule.channels },
        customTitle: rule.customTitle || '',
        customMessage: rule.customMessage || '',
      });
    }
  }, [rule._id, initialRule._id]);

  // Clean up audio when audio changes (upload/delete) and auto-play after upload
  useEffect(() => {
    const currentAudioId = rule.audio?._id || rule.audio?.id || null;
    const previousAudioId = audioIdRef.current;
    
    if (currentAudioId !== previousAudioId) {
      audioIdRef.current = currentAudioId;
      
      // If we just uploaded audio and now have audio data, auto-play it
      if (justUploadedAudioRef.current && currentAudioId && !previousAudioId) {
        // Reset the flag
        justUploadedAudioRef.current = false;
        
        // Small delay to ensure audio is ready, then auto-play using audioService (same as Test button)
        const autoPlayTimer = setTimeout(async () => {
          if (!rule.audio) return;
          
          try {
            // Clear audio cache to ensure fresh audio is fetched
            audioService.clearRuleCache();
            
            setIsPlayingExisting(true);
            
            // Extract projectId from rule scope if it's project-specific
            const projectId = rule.scope?.type === 'project' && rule.scope?.projectId 
              ? rule.scope.projectId.toString() 
              : undefined;
            
            // Use audioService to play notification sound (same as Test button and dashboard)
            await audioService.playNotification(
              0.7, // Volume
              rule.eventType, // Notification type
              projectId // Project ID if project-specific
            );
            
            // Reset playing state after audio finishes
            setTimeout(() => {
              setIsPlayingExisting(false);
            }, 3000);
          } catch (error) {
            console.error('Error auto-playing uploaded audio:', error);
            setIsPlayingExisting(false);
            // Don't show alert for auto-play failures, just log
          }
        }, 300);
        
        return () => {
          clearTimeout(autoPlayTimer);
        };
      }
      
      // Stop playing audio if audio changed (using audioService)
      if (isPlayingExisting) {
        audioService.stopAll();
        setIsPlayingExisting(false);
      }
    }
  }, [rule.audio?._id, rule.audio?.id, rule._id]);

  const handleRoleToggle = (role: string) => {
    const newRoles = formData.recipients.roles.includes(role)
      ? formData.recipients.roles.filter((r) => r !== role)
      : [...formData.recipients.roles, role];
    
    setFormData({
      ...formData,
      recipients: {
        ...formData.recipients,
        roles: newRoles,
      },
    });
  };

  const handleDynamicTargetToggle = (target: keyof typeof formData.recipients.dynamicTargets) => {
    setFormData({
      ...formData,
      recipients: {
        ...formData.recipients,
        dynamicTargets: {
          ...formData.recipients.dynamicTargets,
          [target]: !formData.recipients.dynamicTargets[target],
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateRulePayload = {
      displayName: formData.displayName,
      description: formData.description,
      enabled: formData.enabled,
      priority: formData.priority as 'low' | 'medium' | 'high',
      recipients: formData.recipients,
      channels: formData.channels,
      customTitle: formData.customTitle || undefined,
      customMessage: formData.customMessage || undefined,
    };

    updateRule.mutate(
      { id: rule._id, payload },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  // Cleanup audio refs on unmount
  useEffect(() => {
    return () => {
      // Stop preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
      // Stop any playing audio via audioService
      if (isPlayingExisting) {
        audioService.stopAll();
      }
      // Clean up preview blob URL
      if (selectedFilePreview) {
        URL.revokeObjectURL(selectedFilePreview);
      }
    };
  }, [selectedFilePreview, isPlayingExisting]);

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stop any currently playing preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.src = '';
      }
      setIsPlayingPreview(false);

      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        toast.push(
          createElement(Notification, { title: 'Invalid File Type', type: 'danger' }, 'Please select a valid audio file (MP3, WAV, OGG, or M4A)')
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.push(
          createElement(Notification, { title: 'File Too Large', type: 'danger' }, 'Audio file size must be less than 5MB')
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Revoke previous preview URL if exists
      if (selectedFilePreview) {
        URL.revokeObjectURL(selectedFilePreview);
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setSelectedFilePreview(previewUrl);
    }
  };

  const handleUploadAudio = () => {
    if (selectedFile) {
      // Set flag to auto-play after upload
      justUploadedAudioRef.current = true;
      
      uploadAudio.mutate(
        { id: rule._id, audioFile: selectedFile },
        {
          onSuccess: (response) => {
            // Clear preview state
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setSelectedFile(null);
            if (selectedFilePreview) {
              URL.revokeObjectURL(selectedFilePreview);
              setSelectedFilePreview(null);
            }
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current.src = '';
            }
            setIsPlayingPreview(false);
            
            // The rule will be automatically updated via useNotificationRule hook
            // when the query cache is invalidated
            // Auto-play will be triggered in the useEffect that watches rule.audio
          },
          onError: () => {
            // Reset flag on error
            justUploadedAudioRef.current = false;
          },
        }
      );
    }
  };

  const handleCancelPreview = () => {
    // Stop and reset audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.src = '';
    }
    setIsPlayingPreview(false);
    
    // Clear file selection
    setSelectedFile(null);
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview);
      setSelectedFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlayPreview = async () => {
    if (!selectedFilePreview || !previewAudioRef.current) return;

    const audio = previewAudioRef.current;

    if (isPlayingPreview) {
      // Stop playing
      audio.pause();
      audio.currentTime = 0;
      setIsPlayingPreview(false);
    } else {
      try {
        // Set source if not already set or if it changed
        if (audio.src !== selectedFilePreview) {
          audio.src = selectedFilePreview;
        }
        
        // Reset to beginning
        audio.currentTime = 0;
        
        // Play audio
        await audio.play();
        setIsPlayingPreview(true);
      } catch (error) {
        console.error('Error playing preview:', error);
        setIsPlayingPreview(false);
        toast.push(
          createElement(Notification, { title: 'Playback Error', type: 'danger' }, 'Failed to play audio preview. Please check if the file is a valid audio file.')
        );
      }
    }
  };

  const handlePlayExisting = async () => {
    if (!rule.audio) return;

    // If already playing, stop it
    if (isPlayingExisting) {
      // Stop any playing audio via audioService
      audioService.stopAll();
      setIsPlayingExisting(false);
      return;
    }

    try {
      // Clear audio cache to ensure fresh audio is fetched (same as test notification)
      audioService.clearRuleCache();
      
      // Use the same audio service as the dashboard/test notification
      // This ensures consistent behavior and proper cache busting
      setIsPlayingExisting(true);
      
      // Extract projectId from rule scope if it's project-specific
      const projectId = rule.scope?.type === 'project' && rule.scope?.projectId 
        ? rule.scope.projectId.toString() 
        : undefined;
      
      // Use audioService to play notification sound (same as dashboard test button)
      // This handles cache busting, dynamic audio lookup, and fallback automatically
      await audioService.playNotification(
        0.7, // Volume
        rule.eventType, // Notification type
        projectId // Project ID if project-specific
      );
      
      // Note: audioService.playNotification() plays audio asynchronously
      // The audio will play, but we don't have a direct way to know when it finishes
      // For UI feedback, we'll reset the state after a reasonable delay
      // In practice, the audio typically plays for 1-5 seconds
      setTimeout(() => {
        setIsPlayingExisting(false);
      }, 3000); // Reset after 3 seconds (adjust if typical audio is longer)
      
    } catch (error) {
      console.error('Error playing existing audio:', error);
      setIsPlayingExisting(false);
      toast.push(
        createElement(Notification, { title: 'Playback Error', type: 'danger' }, 'Failed to play audio. Please check your connection and try again.')
      );
    }
  };

  // Set up audio event listeners for preview only (existing audio is handled by audioService)
  useEffect(() => {
    const previewAudio = previewAudioRef.current;

    const handlePreviewEnded = () => {
      setIsPlayingPreview(false);
      if (previewAudio) {
        previewAudio.currentTime = 0;
      }
    };
    
    const handlePreviewPause = () => {
      setIsPlayingPreview(false);
    };

    if (previewAudio) {
      previewAudio.addEventListener('ended', handlePreviewEnded);
      previewAudio.addEventListener('pause', handlePreviewPause);
      previewAudio.addEventListener('error', () => {
        setIsPlayingPreview(false);
        console.error('Preview audio error');
      });
    }

    return () => {
      if (previewAudio) {
        previewAudio.removeEventListener('ended', handlePreviewEnded);
        previewAudio.removeEventListener('pause', handlePreviewPause);
      }
    };
  }, []);

  const handleDeleteAudio = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteAudio = () => {
    deleteAudio.mutate(rule._id, {
      onSuccess: () => {
        // Stop playing if audio was playing (using audioService)
        if (isPlayingExisting) {
          audioService.stopAll();
          setIsPlayingExisting(false);
        }
        // The rule will be automatically updated via useNotificationRule hook
        // when the query cache is invalidated
        setShowDeleteConfirm(false);
      },
      onError: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <HiOutlineBell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Notification Rule</h2>
              <p className="text-sm text-gray-500">Event: <code className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">{rule.eventType}</code></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Enabled</span>
            <Switcher
              checked={formData.enabled}
              onChange={() => setFormData({ ...formData, enabled: !formData.enabled })}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Basic Info Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormItem label="Display Name" className="col-span-1">
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                required
                placeholder="Enter display name"
              />
            </FormItem>
            <FormItem label="Priority" className="col-span-1">
              <Select
                value={formData.priority}
                onChange={(option: any) => option && setFormData({ ...formData, priority: option.value })}
                options={PRIORITY_OPTIONS as any}
              />
            </FormItem>
            <FormItem label="Description" className="col-span-2">
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this notification is sent..."
              />
            </FormItem>
          </div>
        </div>

        {/* Recipients Section */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineUserGroup className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recipients</h3>
          </div>
          
          {/* Role-based Recipients */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Roles that receive this notification</p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.recipients.roles.includes(role)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={formData.recipients.roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                  />
                  <span className="font-medium">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Recipients */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Dynamic recipients (based on event context)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'assignedAgent', label: 'Assigned Agent', desc: 'Agent assigned to the lead/offer' },
                { key: 'projectAgents', label: 'Project Agents', desc: 'All agents in the project' },
                { key: 'leadOwner', label: 'Lead Owner', desc: 'Owner of the lead' },
                { key: 'creator', label: 'Creator', desc: 'Person who created the entity' },
                { key: 'mentionedUsers', label: 'Mentioned Users', desc: 'Users @mentioned in comments' },
              ].map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.recipients.dynamicTargets[key as keyof typeof formData.recipients.dynamicTargets]
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={formData.recipients.dynamicTargets[key as keyof typeof formData.recipients.dynamicTargets]}
                    onChange={() => handleDynamicTargetToggle(key as keyof typeof formData.recipients.dynamicTargets)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900 block">{label}</span>
                    <span className="text-xs text-gray-500">{desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Exclude Creator */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.recipients.excludeCreator}
                onChange={() =>
                  setFormData({
                    ...formData,
                    recipients: {
                      ...formData.recipients,
                      excludeCreator: !formData.recipients.excludeCreator,
                    },
                  })
                }
              />
              <div>
                <span className="font-medium text-gray-900">Exclude event creator</span>
                <p className="text-xs text-gray-500">Don't notify the person who triggered the event</p>
              </div>
            </label>
          </div>
        </div>

        {/* Channels Section */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineMail className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Delivery Channels</h3>
          </div>
          <div className="flex gap-4">
            <label
              className={`flex-1 flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                formData.channels.inApp
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Checkbox
                checked={formData.channels.inApp}
                onChange={() =>
                  setFormData({
                    ...formData,
                    channels: { ...formData.channels, inApp: !formData.channels.inApp },
                  })
                }
              />
              <div>
                <span className="font-medium text-gray-900 block">In-App Notification</span>
                <span className="text-xs text-gray-500">Real-time notification in the app</span>
              </div>
            </label>
            <label
              className="flex-1 flex items-center gap-3 p-4 rounded-lg border bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
            >
              <Checkbox checked={false} disabled />
              <div>
                <span className="font-medium text-gray-500 block">Email Notification</span>
                <span className="text-xs text-gray-400">Coming soon</span>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Message Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Custom Message (Optional)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Override the default notification message. Use placeholders:{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{leadName}'}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{agentName}'}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{projectName}'}</code>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormItem label="Custom Title">
              <Input
                value={formData.customTitle}
                onChange={(e) => setFormData({ ...formData, customTitle: e.target.value })}
                placeholder="Leave empty to use default"
              />
            </FormItem>
            <FormItem label="Custom Message">
              <Input
                value={formData.customMessage}
                onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                placeholder="Leave empty to use default"
              />
            </FormItem>
          </div>
        </div>

        {/* Audio Upload Section */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineMusicNote className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Notification Sound</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Upload a custom audio file to play when this notification is triggered. Supported formats: MP3, WAV, OGG, M4A (max 5MB)
          </p>
          
          {/* Hidden audio element for preview playback */}
          <audio ref={previewAudioRef} preload="metadata" crossOrigin="anonymous" />

          {/* Existing Audio Display */}
          {rule.audio && !selectedFile && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <HiOutlineMusicNote className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{rule.audio.filename}</p>
                    <p className="text-xs text-gray-500">
                      {rule.audio.formattedSize || `${(rule.audio.size / 1024).toFixed(2)} KB`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="xs"
                    variant="plain"
                    icon={<HiOutlinePlay className="w-4 h-4" />}
                    onClick={handlePlayExisting}
                    disabled={deleteAudio.isPending}
                  >
                    {isPlayingExisting ? 'Stop' : 'Test'}
                  </Button>
                  <Button
                    size="xs"
                    variant="plain"
                    icon={<HiOutlineTrash className="w-4 h-4" />}
                    onClick={handleDeleteAudio}
                    loading={deleteAudio.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* No Audio State */}
          {!rule.audio && !selectedFile && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
              <p className="text-sm text-gray-500">No custom audio file uploaded. Default notification sound will be used.</p>
            </div>
          )}

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <HiOutlineMusicNote className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="xs"
                    variant="plain"
                    icon={<HiOutlinePlay className="w-4 h-4" />}
                    onClick={handlePlayPreview}
                  >
                    {isPlayingPreview ? 'Stop' : 'Test'}
                  </Button>
                  <Button
                    size="xs"
                    variant="plain"
                    icon={<HiOutlineX className="w-4 h-4" />}
                    onClick={handleCancelPreview}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="solid"
                  size="sm"
                  onClick={handleUploadAudio}
                  loading={uploadAudio.isPending}
                  disabled={uploadAudio.isPending}
                >
                  {rule.audio ? 'Replace Audio' : 'Upload Audio'}
                </Button>
                <span className="text-xs text-gray-500">
                  {rule.audio ? 'This will replace the existing audio file' : 'Click to upload this audio file'}
                </span>
              </div>
            </div>
          )}

          {/* File Select Button */}
          {!selectedFile && (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
                onChange={handleAudioFileSelect}
                className="hidden"
                id="audio-upload-input"
              />
              <Button
                type="button"
                variant="default"
                icon={<HiOutlineMusicNote className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAudio.isPending || deleteAudio.isPending}
              >
                {rule.audio ? 'Replace Audio' : 'Select Audio File'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <Button variant="default" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="solid"
          type="submit"
          loading={updateRule.isPending}
          icon={<HiOutlineSave className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Delete Audio Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDeleteAudio}
        title="Delete Audio File"
        type="danger"
        confirmText="Delete"
        confirmButtonProps={{ variant: 'destructive' }}
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete the audio file for this notification rule? This action cannot be undone.
        </p>
      </ConfirmDialog>
    </form>
  );
};
