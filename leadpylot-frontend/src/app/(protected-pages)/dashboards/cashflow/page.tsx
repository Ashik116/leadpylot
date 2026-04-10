'use client';

import CashflowEntriesSection from './_components/CashflowEntriesSection';
import CashflowTransactionsSection from './_components/CashflowTransactionsSection';

export default function CashflowPage() {
  return (
    <div className="space-y-6 p-4">
      <CashflowEntriesSection />
      <CashflowTransactionsSection />
    </div>
  );
}
