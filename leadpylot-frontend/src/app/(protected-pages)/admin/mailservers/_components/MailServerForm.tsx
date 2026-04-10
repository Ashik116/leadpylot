'use client';

import { useParams } from 'next/navigation';
import MailServerFormWrapperComponent from './MailServerFormWrapperComponent';

function MailServerForm({ type }: { type: 'create' | 'edit' }) {
  const { id } = useParams();

  return <MailServerFormWrapperComponent type={type} id={id as string} isPage={true} />;
}

export default MailServerForm;
