import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Active Call - LeadPylot',
  description: 'LeadPylot VoIP Call Window',
};

export default function CallWindowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      {children}
    </div>
  );
}
