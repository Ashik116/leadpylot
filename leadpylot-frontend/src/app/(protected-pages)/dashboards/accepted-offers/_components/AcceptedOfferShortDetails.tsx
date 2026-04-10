import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { CustomCard, InfoItem, SkeletonItem } from '@/components/shared/CustomCard/CustomCard';
import { useLeadConditional } from '@/services/hooks/useLeads';
import { useRouter } from 'next/navigation';

const AcceptedOfferShortDetails = ({ expandedRowId, row }: { expandedRowId: string, row: any }) => {
    const router = useRouter();
    const isExpanded = expandedRowId === row.original._id.toString();
    const offer = row.original;
    const leadId = offer?.leadId ?? offer?._id;
    const { data: leadData, isLoading } = useLeadConditional(leadId, isExpanded);
    const enhancedLead = leadData || offer.lead;
    // Action button component
    const ActionButton = ({ icon, text, disabled, onClick }: {
        icon: string, text: string, disabled?: boolean, onClick: () => void
    }) => (

        <Button
            onClick={onClick}
            size="xs"
            variant="secondary"
            disabled={disabled}
            className="gap-1"
        >
            <div className='flex items-center gap-1'>
                <ApolloIcon name={icon as any} className="text-xs" />
                <span className='text-xs'>{text}</span>
            </div>
        </Button>
    );

    const cardData = [
        {
            title: 'Leads Information',
            items: [
                { icon: 'user', label: 'Name', value: enhancedLead?.contact_name || 'N/A' },
                {
                    icon: 'mail',
                    label: 'Email',
                    value: enhancedLead?.email_from || 'N/A',
                    action: <ActionButton
                        icon="mail"
                        text="Email"
                        disabled={!enhancedLead?.email_from}
                        onClick={() => router.push(`/dashboards/leads/${enhancedLead.lead?._id}`)}
                    />
                },
                {
                    icon: 'phone',
                    label: 'Phone',
                    value: enhancedLead?.phone || 'N/A',
                    action: <ActionButton
                        icon="phone"
                        text="Call"
                        disabled={!enhancedLead?.phone}
                        onClick={() => router.push(`/dashboards/leads/${enhancedLead.lead?._id}`)}
                    />
                }
            ]
        },
        {
            title: 'Lead Overview',
            items: [
                { icon: 'dollar', label: 'Expected Revenue', value: enhancedLead?.expected_revenue || 'N/A' },
                { icon: 'briefcase', label: 'Project', value: Array.isArray(enhancedLead?.project) ? enhancedLead?.project?.[0]?.name || 'N/A' : enhancedLead?.project?.name || 'N/A' },
                { icon: 'user', label: 'Agent', value: Array.isArray(enhancedLead?.project) ? enhancedLead?.project?.[0]?.agent?.login || 'N/A' : (enhancedLead?.project as any)?.agent?.login || 'N/A' }
            ]
        },
        {
            title: 'Offer Details',
            items: [
                { icon: 'dollar', label: 'Investment', value: offer?.investmentVolume ? `$${offer?.investmentVolume.toFixed(2)}` : 'N/A' },
                { icon: 'growth-up', label: 'Rate', value: offer?.interestRate ? `${offer?.interestRate}%` : 'N/A' },
                {
                    icon: 'check',
                    label: 'Status',
                    value: (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${offer?.status === 'active' ? 'bg-evergreen text-white' : 'bg-rust text-white'
                            }`}>
                            {offer?.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    )
                }
            ]
        },
        {
            title: 'Documentation',
            items: [
                { icon: 'file', label: 'Files Count', value: `${offer?.filesCount || 0} file(s)` },
                { icon: 'calendar', label: 'Created On', value: offer?.createdOn || 'N/A' },
                {
                    icon: 'pen',
                    label: 'Notes',
                    value: offer?.notes || 'No notes',

                }
            ]
        }
    ];

    return (
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`} onClick={() => router.push(`/dashboards/leads/${leadId}`)}>
            <div className="bg-sand-5/30 p-6">
                <div className="grid gap-6 grid-cols-4">
                    {cardData.map((card, index) => (
                        <CustomCard key={index} title={card.title}>
                            {isExpanded && isLoading ? (
                                // Show skeleton only for the third card when loading
                                <>
                                    <SkeletonItem />
                                    <SkeletonItem />
                                    <SkeletonItem />
                                </>
                            ) : (
                                card.items.map((item, itemIndex) => (
                                    <InfoItem
                                        key={itemIndex}
                                        icon={item.icon}
                                        label={item.label}
                                        value={item.value}
                                        action={item.action}
                                    />
                                ))
                            )}
                        </CustomCard>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AcceptedOfferShortDetails; 
