'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Notification from '@/components/ui/Notification';
import Loading from '@/components/shared/Loading';
import toast from '@/components/ui/toast';
import { useReclamationById } from '@/services/hooks/useReclamation';
import { apiUpdateReclamation } from '@/services/ReclamationsService';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import ReclamationHeader from './_components/ReclamationHeaders';
import ReclamationOverviewCard from './_components/ReclamationOverviewCard';
import LeadSnapshotCard from './_components/LeadSnapshotCard';
import ResolutionCard from './_components/ResolutionCard';

interface AgentInfo {
  _id: string;
  login?: string;
  info?: { email?: string; name?: string };
}

interface LeadInfo {
  _id: string;
  contact_name?: string;
  email_from?: string;
  phone?: string;
  lead_source_no?: string;
  leadPrice?: number;
  lead_date?: string;
  status?: string;
  stage?: string;
  use_status?: string;
  reclamation_status?: string;
  source_id?: { name?: string };
  expected_revenue?: number;
}

interface ExtendedReclamation {
  _id: string;
  project_id: string;
  agent_id: AgentInfo;
  lead_id: LeadInfo;
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReclamationDetails() {
  const [responseText, setResponseText] = useState<string>('');
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const {
    data: reclamationResponse,
    isLoading,
    refetch,
  } = useReclamationById(id) as {
    data: { data: ExtendedReclamation };
    isLoading: boolean;
    refetch: () => void;
  };
  const [status, setStatus] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: session } = useSession();

  const userRole = session?.user?.role as string;
  const canUpdateStatus = userRole === Role?.ADMIN || userRole === Role?.PROVIDER;
  const isPending = reclamationResponse?.data?.status === 0;

  useEffect(() => {
    if (reclamationResponse?.data) {
      setStatus(reclamationResponse?.data?.status);
      setResponseText(reclamationResponse?.data?.response || '');
    }
  }, [reclamationResponse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canUpdateStatus || !isPending) {
      toast.push(
        <Notification title="Permission Denied" type="danger">
          You don&apos;t have permission to update this reclamation or it&apos;s already processed
        </Notification>
      );
      return;
    }
    if (!id || status === null) return;
    setSubmitting(true);
    try {
      const defaultResponseMessage =
        status === 1
          ? "Reclamation accepted, we'll address this issue"
          : status === 2
            ? 'Reclamation rejected, please contact support for more information'
            : 'Reclamation is pending review';

      await apiUpdateReclamation(id, {
        status,
        response: responseText || defaultResponseMessage,
      });

      toast.push(
        <Notification title="Reclamation updated" type="success">
          Status updated successfully
        </Notification>
      );
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err?.response?.data?.message || 'Failed to update reclamation';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    router.push('/dashboards/reclamations');
  };

  if (isLoading) return <Loading loading={true} />;
  if (!reclamationResponse?.data) return <div>No reclamation found.</div>;

  const reclamation = reclamationResponse.data as ExtendedReclamation;

  return (
    <div className="space-y-2">
      <ReclamationHeader
        title="Reclamation Details"
        status={reclamation?.status}
        onBack={handleBackClick}
      />

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-1">
        <ReclamationOverviewCard
          createdAt={reclamation?.createdAt}
          updatedAt={reclamation?.updatedAt}
          lead={reclamation?.lead_id}
        />

        <LeadSnapshotCard lead={reclamation?.lead_id} />

        <ResolutionCard
          reason={reclamation?.reason}
          response={responseText}
          status={status}
          onResponseChange={setResponseText}
          onStatusChange={setStatus}
          onSubmit={handleSubmit}
          canEdit={canUpdateStatus}
          isPending={isPending}
          isSubmitting={submitting}
        />
      </div>
    </div>
  );
}
