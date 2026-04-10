'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import AxiosBase from '@/services/axios/AxiosBase';
import ThreadEmailSelector from '../Shared/ThreadEmailSelector';
import ThreadAttachmentSelector from '../Shared/ThreadAttachmentSelector';
import { EmailMessage } from '../../_types/email.types';

interface Agent {
  _id: string;
  name: string;
  login: string;
  email?: string;
}

interface AssignAgentModalProps {
  emailId: string;
  emailSubject: string;
  threadEmails?: EmailMessage[];
  currentAssignedAgent?: string;
  currentVisibleAgents?: string[];
  onClose: () => void;
}

export default function AssignAgentModal({
  emailId,
  emailSubject,
  threadEmails = [],
  currentAssignedAgent,
  currentVisibleAgents = [],
  onClose,
}: AssignAgentModalProps) {
  const queryClient = useQueryClient();
  const [primaryAgent, setPrimaryAgent] = useState(currentAssignedAgent || '');
  const [visibleAgents, setVisibleAgents] = useState(currentVisibleAgents);
  const [comments, setComments] = useState('');
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<EmailMessage[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  const hasThread = threadEmails.length > 1;

  const effectiveSelectedEmails = useMemo(() => {
    return threadEmails.length === 1 && selectedEmails.length === 0
      ? threadEmails
      : selectedEmails;
  }, [threadEmails, selectedEmails]);

  const allAvailableAttachments = useMemo(() => {
    return effectiveSelectedEmails.flatMap(
      (email) => email.attachments || []
    );
  }, [effectiveSelectedEmails]);

  const hasAttachments = useMemo(() => {
    return allAvailableAttachments.length > 0;
  }, [allAvailableAttachments.length]);

  useEffect(() => {
    if (hasAttachments && selectedAttachmentIds.length === 0) {
      setSelectedAttachmentIds(allAvailableAttachments.map((att) => att.document_id));
    }
  }, [hasAttachments, allAvailableAttachments, selectedAttachmentIds.length]);

  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await AxiosBase.get('/users/agents');
      return response.data.data || [];
    },
  });

  const agentOptions = useMemo(
    () =>
      agents.map((agent) => ({
        value: agent._id,
        label: `${(agent as any)?.info?.name} (@${agent.login})`,
      })),
    [agents]
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      await AxiosBase.post(`/email-system/${emailId}/assign-agent`, {
        agent_id: primaryAgent,
        visible_to_agents: visibleAgents,
        comments,
        selected_email_ids: hasThread && selectedEmailIds.length > 0 ? selectedEmailIds : undefined,
        selected_attachment_ids: selectedAttachmentIds.length > 0 ? selectedAttachmentIds : undefined,
      });
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Email assigned to agent successfully
        </Notification>,

      );
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email', emailId] });
      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to assign agent'}
        </Notification>,

      );
    },
  });

  const handleEmailChange = useCallback((ids: string[], emails: EmailMessage[]) => {
    setSelectedEmailIds(ids);
    setSelectedEmails(emails);
    setSelectedAttachmentIds([]);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!primaryAgent) {
        toast.push(
          <Notification title="Error" type="warning">
            Please select a primary agent
          </Notification>,

        );
        return;
      }

      if (!visibleAgents.includes(primaryAgent)) {
        setVisibleAgents((prev) => [...prev, primaryAgent]);
      }

      assignMutation.mutate();
    },
    [primaryAgent, visibleAgents, assignMutation]
  );

  return (
    <Dialog isOpen={true} onClose={onClose} width={700}>
      <form onSubmit={handleSubmit} className="flex h-auto flex-col">
        <div className="border-b border-gray-200 pt-2 pb-4">
          <div className="flex items-center gap-3 pl-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <ApolloIcon name="user-check" className="text-2xl text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Assign Email to Agent</h3>
              <p className="mt-1 line-clamp-1 text-sm text-gray-600">{emailSubject}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <div className="space-y-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                1
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-900">
                  Select Primary Agent <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">The main agent responsible for handling this email</p>
              </div>
            </div>

            {isLoadingAgents ? (
              <div className="text-sm text-gray-500">Loading agents...</div>
            ) : (
              <Select
                options={agentOptions}
                value={agentOptions.find((opt) => opt.value === primaryAgent) || null}
                onChange={(option) => setPrimaryAgent(option?.value || '')}
                placeholder="Select an agent..."
                className="w-full"
                isClearable={false}
                maxMenuHeight={320}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
                  menu: (base) => ({ ...base, zIndex: 10000 }),
                }}
              />
            )}
          </div>

          {hasThread && (
            <div className="space-y-3">
              <ThreadEmailSelector
                emails={threadEmails}
                selectedEmailIds={selectedEmailIds}
                primaryAgent={primaryAgent}
                onChange={handleEmailChange}
              />
            </div>
          )}

          {effectiveSelectedEmails.length > 0 && hasAttachments && (
            <div className="space-y-3">
              <ThreadAttachmentSelector
                selectedEmails={effectiveSelectedEmails}
                selectedAttachmentIds={selectedAttachmentIds}
                onChange={setSelectedAttachmentIds}
                hasThread={hasThread}
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="mb-3 flex items-center gap-2">
                <ApolloIcon name="comment" className="text-gray-400" />
                <div>
                  <label className="block text-base font-semibold text-gray-900">
                    Add Notes <span className="text-sm font-normal text-gray-400">(Optional)</span>
                  </label>
                  <p className="text-xs text-gray-500">Add any additional context or instructions for the agent</p>
                </div>
              </div>
              <Button type="button" variant="secondary" className="mb-2" onClick={() => setShowNotes((prev) => !prev)}>
                {showNotes ? 'Hide Notes' : 'Add Notes'}
              </Button>
            </div>
            {showNotes && (
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Please follow up within 24 hours..."
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <ApolloIcon name="shield" className="text-gray-400" />
            <span>Auto-approval ensures immediate agent access</span>
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="plain" onClick={onClose} disabled={assignMutation.isPending} className="px-6">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              loading={assignMutation.isPending}
              disabled={!primaryAgent || assignMutation.isPending}
              icon={<ApolloIcon name="user-check" />}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign & Approve'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
