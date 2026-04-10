import { useState } from 'react';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import React from 'react';
import {
  apiSendBulkLeadEmail,
  apiSendProjectEmail,
  SendProjectEmailParams,
} from '@/services/notifications/NotificationsService';
import { inlineTableStyles } from '@/utils/emailHtmlUtils';
type Type = 'success' | 'warning' | 'danger' | 'info';

const useNotification = () => {
  const [notificationType, setNotificationType] = useState<Type>('info');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const openNotification = ({ type, massage = 'Success' }: { type: Type; massage?: string }) => {
    setNotificationType(type);
    toast.push(
      <Notification title={type.charAt(0).toUpperCase() + type.slice(1)} type={type}>
        {massage}
      </Notification>
    );
  };

  const sendProjectEmail = async (params: SendProjectEmailParams) => {
    try {
      setIsSendingEmail(true);
      const processedParams = {
        ...params,
        html: params.html ? inlineTableStyles(params.html) : params.html,
      };
      let response;
      if (!processedParams?.lead_ids) response = await apiSendProjectEmail(processedParams);
      else response = await apiSendBulkLeadEmail(processedParams);
      openNotification({ type: 'success', massage: 'Email sent successfully' });
      return response;
    } catch (error) {
      console.error('Failed to send email:', error);
      openNotification({
        type: 'danger',
        massage: error instanceof Error ? error.message : 'Failed to send email',
      });
      throw error;
    } finally {
      setIsSendingEmail(false);
    }
  };

  return {
    openNotification,
    notificationType,
    sendProjectEmail,
    isSendingEmail,
  };
};

export default useNotification;
