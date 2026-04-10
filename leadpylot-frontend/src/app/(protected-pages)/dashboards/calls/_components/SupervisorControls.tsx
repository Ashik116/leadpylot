'use client';

import React, { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Notification from '@/components/ui/Notification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import { useSupervisorActions, useSupervisorSessions } from '@/services/hooks/useSupervisorActions';
import type { ActiveCall } from '@/services/MonitoringService';

interface SupervisorControlsProps {
  call: ActiveCall;
  disabled?: boolean;
}

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  title: string;
  description: string;
  actionType: 'spy' | 'whisper' | 'barge' | 'disconnect';
  isLoading: boolean;
}

const ActionDialog: React.FC<ActionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType,
  isLoading
}) => {
  const [justification, setJustification] = useState('');

  const handleConfirm = () => {
    if (!justification.trim()) {
      toast.push(
        <Notification type="danger">
          Business justification is required for compliance
        </Notification>
      );
      return;
    }
    onConfirm(justification);
  };

  const getActionTypeInfo = () => {
    switch (actionType) {
      case 'spy':
        return {
          icon: 'eye',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'whisper':
        return {
          icon: 'message-circle',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'barge':
        return {
          icon: 'users',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'disconnect':
        return {
          icon: 'phone-x',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: 'phone',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const actionInfo = getActionTypeInfo();

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="p-6">
        <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${actionInfo.bgColor} ${actionInfo.borderColor} border`}>
          <ApolloIcon 
            name={actionInfo.icon === 'eye' ? 'view-list' : 
                  actionInfo.icon === 'message-circle' ? 'bubble-question' :
                  actionInfo.icon === 'users' ? 'users' :
                  actionInfo.icon === 'phone-x' ? 'phone-decline' : 'phone'} 
            className={`w-6 h-6 ${actionInfo.color}`} 
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        <Alert type="warning" className="mb-4" showIcon>
          <ApolloIcon name="alert-triangle" className="w-4 h-4" />
          <div>
            <strong>Compliance Notice:</strong> This action will be logged for audit purposes. 
            Please provide a business justification.
          </div>
        </Alert>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Justification *
            </label>
            <Input
              placeholder="Enter reason for supervisor action (required for compliance)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: Quality monitoring, Agent coaching, Customer escalation, Technical support
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={actionType === 'disconnect' ? 'destructive' : 'solid'}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={!justification.trim()}
          >
            <ApolloIcon name={actionInfo.icon === 'eye' ? 'view-list' : 
                              actionInfo.icon === 'message-circle' ? 'bubble-question' :
                              actionInfo.icon === 'users' ? 'users' :
                              actionInfo.icon === 'phone-x' ? 'phone-decline' : 'phone'} 
                      className="w-4 h-4 mr-2" />
            Confirm {title}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export const SupervisorControls: React.FC<SupervisorControlsProps> = ({
  call,
  disabled = false
}) => {
  const [activeDialog, setActiveDialog] = useState<'spy' | 'whisper' | 'barge' | 'disconnect' | null>(null);
  
  const {
    spyOnCall,
    whisperToAgent,
    bargeIntoCall,
    disconnectCall,
    isLoading
  } = useSupervisorActions();

  const { data: sessionsData } = useSupervisorSessions();

  // Check for active sessions for this specific call
  const activeSessions = useMemo(() => {
    const sessions = sessionsData?.data?.sessions || [];
    const callExtension = call.extension;
    
    return sessions.filter(session => 
      session.targetExtension === callExtension && 
      session.status === 'active'
    );
  }, [sessionsData, call.extension]);

  const activeSessionTypes = useMemo(() => {
    return new Set(activeSessions.map(session => session.type));
  }, [activeSessions]);

  const handleAction = async (actionType: 'spy' | 'whisper' | 'barge' | 'disconnect', justification: string) => {
    try {
      // Use callId, fallback to uniqueId if callId is undefined
      const callIdentifier = call.callId || call.uniqueId;
      
      if (!callIdentifier) {
        console.error('SupervisorControls - No call identifier available', { call });
        throw new Error('No call identifier available');
      }
      
      // Debug: Log what we're about to send
      console.log(`🚀 SupervisorControls - ${actionType} action:`, {
        callId: callIdentifier,
        justification,
        actionType
      });
      
      let result;
      
      switch (actionType) {
        case 'spy':
          result = await spyOnCall({ callId: callIdentifier, justification });
          toast.push(
            <Notification type="success">
              Call spy initiated successfully
            </Notification>
          );
          break;
        case 'whisper':
          result = await whisperToAgent({ callId: callIdentifier, justification });
          toast.push(
            <Notification type="success">
              Whisper to agent initiated successfully
            </Notification>
          );
          break;
        case 'barge':
          result = await bargeIntoCall({ callId: callIdentifier, justification });
          toast.push(
            <Notification type="success">
              Barge into call initiated successfully
            </Notification>
          );
          break;
        case 'disconnect':
          result = await disconnectCall({ callId: callIdentifier, justification });
          toast.push(
            <Notification type="success">
              Call disconnected successfully
            </Notification>
          );
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      setActiveDialog(null);
      
    } catch (error: any) {
      console.error(`SupervisorControls - Failed to ${actionType}:`, error);
      toast.push(
        <Notification type="danger">
          {error.message || `Failed to ${actionType}`}
        </Notification>
      );
    }
  };

  const actionButtons = [
    {
      id: 'spy',
      label: 'Spy',
      icon: 'view-list',
      variant: 'secondary' as const,
      title: 'Listen to Call',
      description: 'Listen to the conversation without being heard by either party'
    },
    {
      id: 'whisper',
      label: 'Whisper',
      icon: 'bubble-question',
      variant: 'secondary' as const,
      title: 'Whisper to Agent',
      description: 'Speak privately to the agent without the customer hearing'
    },
    {
      id: 'barge',
      label: 'Barge',
      icon: 'users',
      variant: 'secondary' as const,
      title: 'Join Conference',
      description: 'Join the call as a three-way conference (customer will hear you)'
    },
    {
      id: 'disconnect',
      label: 'End Call',
      icon: 'phone-decline',
      variant: 'destructive' as const,
      title: 'Disconnect Call',
      description: 'Immediately terminate the call'
    }
  ] as const;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actionButtons.map((action) => {
          const isActive = activeSessionTypes.has(action.id as 'spy' | 'whisper' | 'barge');
          
          return (
            <div key={action.id} className="relative">
              <Button
                size="sm"
                variant={isActive ? 'default' : action.variant}
                onClick={() => setActiveDialog(action.id)}
                disabled={disabled || isLoading}
                className={`text-xs ${isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              >
                <ApolloIcon name={action.icon} className="w-3 h-3 mr-1" />
                {action.label}
                {isActive && (
                  <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse" />
                )}
              </Button>
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
          );
        })}
      </div>

      {/* Action Dialogs */}
      {actionButtons.map((action) => (
        <ActionDialog
          key={action.id}
          isOpen={activeDialog === action.id}
          onClose={() => setActiveDialog(null)}
          onConfirm={(justification) => handleAction(action.id, justification)}
          title={action.title}
          description={action.description}
          actionType={action.id}
          isLoading={isLoading}
        />
      ))}
    </>
  );
};

export default SupervisorControls;
