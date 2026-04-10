'use client';

import { useParams } from 'next/navigation';
import VoipFromWrapperComponent from './VoipFromWrapperComponent';
function VoipForm({ type }: { type: 'create' | 'edit' }) {
  const { id } = useParams();

  return <VoipFromWrapperComponent type={type} id={id as string} isPage={true} />;
}

export default VoipForm;
