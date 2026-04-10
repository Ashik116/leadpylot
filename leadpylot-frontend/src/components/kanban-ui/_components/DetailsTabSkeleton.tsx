'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton/Skeleton';

export const DetailsTabSkeleton: React.FC = () => {
  return (
    <div className="flex h-full min-w-0 max-w-full flex-col overflow-y-auto p-4 pr-3">
      <div className="space-y-1.5 min-w-0 max-w-full">
        {/* View Details Button Skeleton */}
        <div className="flex items-center justify-end gap-2 mb-2">
          <Skeleton width="120px" height="32px" className="rounded-lg" />
        </div>

        {/* Contact Information & Lead Information Cards Grid */}
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2 min-w-0 max-w-full">
          {/* Contact Information Card Skeleton */}
          <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-4">
            {/* Header with Title */}
            <div className="flex items-center justify-between mb-3">
              <Skeleton width="140px" height="18px" className="rounded font-semibold" />
              <div className="flex gap-2">
                <Skeleton width="40px" height="14px" className="rounded" />
                <Skeleton width="50px" height="14px" className="rounded" />
              </div>
            </div>

            {/* Contact Fields Skeleton */}
            <div className="space-y-3">
              {['Contact', 'Email', 'Phone', 'Revenue', 'Partner ID'].map((field, idx) => (
                <div key={idx} className="flex min-h-6 items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex min-w-[100px] shrink-0 items-center gap-2">
                      <Skeleton width="14px" height="14px" className="rounded" />
                      <Skeleton width="60px" height="14px" className="rounded" />
                    </div>
                    <div className="min-w-0 flex-1 max-w-full">
                      <Skeleton width={idx === 0 ? "80%" : idx === 1 ? "85%" : idx === 2 ? "70%" : idx === 3 ? "60%" : "75%"} height="16px" className="rounded" />
                    </div>
                  </div>
                  {(field === 'Contact' || field === 'Email' || field === 'Phone' || field === 'Partner ID') && (
                    <Skeleton width="16px" height="16px" className="rounded shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lead Information Card Skeleton */}
          <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-4">
            {/* Header */}
            <div className="flex h-8 items-center justify-between mb-2">
              <Skeleton width="120px" height="18px" className="rounded font-semibold" />
              <Skeleton width="100px" height="14px" className="rounded" />
            </div>
            
            {/* Lead Fields Skeleton */}
            <div className="space-y-2">
              {['Project', 'Assigned'].map((field, idx) => (
                <div key={idx} className="flex h-6 items-center justify-between">
                  <div className="flex items-center justify-start gap-2">
                    <Skeleton width="14px" height="14px" className="rounded" />
                    <Skeleton width="70px" height="14px" className="rounded font-bold" />
                  </div>
                  <div className="flex min-w-20 items-center justify-end pr-1">
                    {idx === 0 ? (
                      <Skeleton width="120px" height="20px" className="rounded" />
                    ) : (
                      <Skeleton width="100px" height="14px" className="rounded" />
                    )}
                  </div>
                </div>
              ))}
              
              {/* Time Frame Card Skeleton */}
              <div className="space-y-2 pt-2">
                <div className="flex h-6 items-center justify-between">
                  <Skeleton width="60px" height="14px" className="rounded" />
                  <Skeleton width="100px" height="14px" className="rounded" />
                </div>
                <div className="flex h-6 items-center justify-between">
                  <Skeleton width="70px" height="14px" className="rounded" />
                  <Skeleton width="100px" height="14px" className="rounded" />
                </div>
              </div>
              
              {/* Current Status Badge Skeleton */}
              <div className="pt-2">
                <Skeleton width="100px" height="24px" className="rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Offers Section Skeleton */}
        <div className="space-y-2">
          <Skeleton width="80px" height="20px" className="rounded font-semibold" />
          <div className="rounded-lg border border-gray-200 bg-white p-1">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-9 gap-2 mb-2 pb-2 border-b border-gray-200 px-2 min-w-0">
              {['Project', 'Agent', 'Bank', 'offer Status', 'INV', 'RATE', 'MON', 'BON', "OFFER S' CREATED"].map((header, idx) => (
                <Skeleton key={idx} width="100%" height="14px" className="rounded max-w-full" />
              ))}
            </div>
            
            {/* Table Row Skeleton */}
            <div className="grid grid-cols-9 gap-2 pt-2 px-2 min-w-0">
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="20px" className="rounded-full max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              <Skeleton width="100%" height="16px" className="rounded max-w-full" />
            </div>
          </div>
        </div>

        {/* Sales Details Section Skeleton */}
        <div className="space-y-2">
          <Skeleton width="120px" height="20px" className="rounded font-semibold" />
          <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
            {/* Three Column Grid Layout */}
            <div className="grid grid-cols-1 gap-x-5 lg:grid-cols-3">
              {/* Column 1: Investment, Month, Rate, Bonus */}
              <div className="space-y-3">
                {['Investment', 'Month', 'Rate', 'Bonus'].map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <Skeleton width="70px" height="14px" className="rounded font-semibold" />
                      <Skeleton width={idx === 0 ? "80px" : "50px"} height="14px" className="rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 2: O/L, Created At, Src, Type, Agent */}
              <div className="space-y-3">
                {/* O/L with dropdown */}
                <div className="flex items-center justify-between">
                  <Skeleton width="40px" height="14px" className="rounded font-semibold" />
                  <Skeleton width="100px" height="32px" className="rounded-lg" />
                </div>
                {['Created At', 'Src', 'Type', 'Agent'].map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <Skeleton width="80px" height="14px" className="rounded font-semibold" />
                      <Skeleton width="100px" height="14px" className="rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 3: Bank, Provider, Ref, IBAN */}
              <div className="space-y-3">
                {['Bank', 'Provider', 'Ref', 'IBAN'].map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <Skeleton width="70px" height="14px" className="rounded font-semibold" />
                      <Skeleton width={idx === 2 || idx === 3 ? "40px" : "120px"} height="14px" className="rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Status Section Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton width="120px" height="20px" className="rounded font-semibold" />
            <Skeleton width="100px" height="32px" className="rounded-lg" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="space-y-3">
              {['Send Amount', 'Agent Commission', 'Pay Status Agent', 'Bank Commission', 'Company Revenue'].map((field, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <Skeleton width="140px" height="14px" className="rounded" />
                  <Skeleton width={idx === 0 || idx === 2 || idx === 4 ? "100px" : "60px"} height="16px" className="rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Split Agents Section Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton width="100px" height="20px" className="rounded font-semibold" />
            <Skeleton width="100px" height="32px" className="rounded-lg bg-gray-200" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            {/* Empty state - no agents yet */}
          </div>
        </div>

        {/* Inbound Agents Section Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton width="120px" height="20px" className="rounded font-semibold" />
            <Skeleton width="110px" height="32px" className="rounded-lg bg-gray-200" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            {/* Empty state - no agents yet */}
          </div>
        </div>

        {/* Documents Section Skeleton */}
        <div className="space-y-2">
          <Skeleton width="100px" height="20px" className="rounded font-semibold" />
          <div className="rounded-lg border border-gray-200 bg-white p-1">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-4 gap-4 mb-2 pb-2 border-b border-gray-200 px-2 min-w-0">
              {['DOCUMENT NAME', 'TYPE', 'UPDATED AT', 'SIZE'].map((header, idx) => (
                <Skeleton key={idx} width="100%" height="14px" className="rounded max-w-full" />
              ))}
            </div>
            
            {/* Table Rows Skeleton */}
            {[1, 2, 3].map((row) => (
              <div key={row} className="grid grid-cols-4 gap-4 pt-2 px-2 min-w-0">
                <Skeleton width="100%" height="16px" className="rounded max-w-full" />
                <Skeleton width="100%" height="20px" className="rounded-full max-w-full" />
                <Skeleton width="100%" height="16px" className="rounded max-w-full" />
                <Skeleton width="100%" height="16px" className="rounded max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsTabSkeleton;
