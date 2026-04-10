import OpeningDetailsForMail from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/OpeningDetailsForMail';
import { ApolloIcon } from '@/components/ui/ApolloIcon';
import { Lead } from '../../../projects/Type.Lead.project';
import { useMemo, useState } from 'react';
import { useLeadDetails } from '@/app/(protected-pages)/dashboards/mails/_hooks/useEmailData';
import classNames from '@/utils/classNames';
import Button from '@/components/ui/Button/Button';
import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';

const SaleDetailsLeads = ({
  lead,
  className = 'max-h-[250px]',
  openingIdToShow,
  onEdit,
  dashboardType,
}: {
  lead: Lead;
  className?: string;
  openingIdToShow?: string; // Optional: if provided, only show this specific opening
  onEdit?: (opening: any) => void;
  dashboardType?: any;
}) => {
  // Track collapsed openings (default is expanded, so we only track collapsed ones)
  const [collapsedOpenings, setCollapsedOpenings] = useState<Set<string>>(new Set());
  const { data: leadData, isLoading, error } = useLeadDetails(lead?._id);

  const offers = (lead as any)?.offers || [];

  const openingsWithOffers = useMemo(() => {
    const allOpenings: Array<{ opening: any; offer: any }> = [];
    offers.forEach((offer: any) => {
      if (offer?.openings && Array.isArray(offer.openings)) {
        offer.openings.forEach((opening: any) => {
          allOpenings.push({ opening, offer });
        });
      }
    });

    // Get top-level openings
    const topLevelOpenings = leadData?.openings || leadData?.data?.openings || [];
    if (Array.isArray(topLevelOpenings)) {
      topLevelOpenings.forEach((opening: any) => {
        // Deduplicate
        if (allOpenings.some((item) => item.opening._id === opening._id)) return;

        // Match with offer
        const offer = offers.find((o: any) => o._id === opening.offer_id);
        allOpenings.push({ opening, offer });
      });
    }

    // Filter to show only specific opening if openingIdToShow is provided
    if (openingIdToShow) {
      return allOpenings.filter((item) => item.opening._id === openingIdToShow);
    }

    // Return in API order (no sorting)
    return allOpenings;
  }, [offers, leadData, openingIdToShow]);

  const toggleOpening = (openingId: string) => {
    setCollapsedOpenings((prev) => {
      const updated = new Set(prev);
      if (updated.has(openingId)) {
        updated.delete(openingId);
      } else {
        updated.add(openingId);
      }
      return updated;
    });
  };
  const offersIds = [...new Set(openingsWithOffers.map((item) => item.opening._id || item.offer._id))];
  // console.log({ offersIds })
  return (
    <div className="">
      {openingsWithOffers?.length > 0 ? (
        <>
          {/* Sales Details - Opening/Offer Information */}
          {/* <h6>Opening</h6> */}

          <div className={classNames('space-y-2 overflow-y-auto', className)}>
            {openingsWithOffers?.map(({ opening, offer }: any, index: number) => {
              if (!opening?._id) return null;

              const openingId = opening._id;
              // Default to expanded (not in collapsed set means expanded)
              const isExpanded = !collapsedOpenings.has(openingId);

              return (
                <div key={openingId || index} className=" ">
                  <div className="grid grid-cols-2 items-center rounded-md transition-colors">
                    <div
                      className="flex flex-1 cursor-pointer items-center hover:bg-gray-50"
                      onClick={() => toggleOpening(openingId)}
                    >
                      <div className="flex w-full items-center justify-between bg-white">
                        {openingsWithOffers.length > 1 ? (
                          <h6 className="">Opening {index + 1}</h6>
                        ) : (
                          <h6 className="font-semibold">
                            {dashboardType === DashboardType.OPENING ? 'Opening' : 'Current Offer'}
                          </h6>
                        )}

                        <Button
                          size="sm"
                          variant="plain"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(opening);
                          }}
                          className="flex items-center justify-center gap-1 p-2"
                          title={
                            dashboardType === DashboardType.OPENING ? 'Edit Opening' : 'Edit Offer'
                          }
                        >
                          <ApolloIcon name="pen" className="text-xs text-black" />
                          <span className="text-sm">
                            {dashboardType === DashboardType.OPENING
                              ? 'Edit Opening'
                              : 'Edit Offer'}
                          </span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 bg-white">
                      <Button
                        size="sm"
                        variant="plain"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOpening(openingId);
                        }}
                        className="flex items-center justify-center"
                      >
                        <ApolloIcon
                          name={isExpanded ? 'chevron-arrow-down' : 'chevron-arrow-right'}
                          className="text-lg"
                        />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <OpeningDetailsForMail
                      opening={opening}
                      offer={offer}
                      lead={lead}
                      openingIdFromProp={openingId}
                      dashboardType={dashboardType}
                      offerIds={offersIds}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default SaleDetailsLeads;
