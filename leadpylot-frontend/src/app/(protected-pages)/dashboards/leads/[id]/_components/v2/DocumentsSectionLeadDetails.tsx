import DocumentsSectionTable from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/DocumentsSectionTable';
import { Lead } from '../../../projects/Type.Lead.project';
import { useMemo } from 'react';

const DocumentsSectionLeadDetails = ({ lead }: { lead: Lead }) => {
    const allDocuments = useMemo(() => {
        const allFiles: any[] = [];
    
        // Collect files from all offers
        (lead as any)?.offers?.forEach((offer: any) => {
          if (offer?.files && Array.isArray(offer.files)) {
            allFiles.push(...offer.files);
          }
        });
    
        // Top-level documents
        // const topLevelDocs = leadData?.documents?.all || leadData?.data?.documents?.all || [];
        // if (Array.isArray(topLevelDocs)) {
        //   allFiles.push(...topLevelDocs);
        // }
    
        // Deduplicate by _id
        const uniqueFiles = Array.from(
          new Map(allFiles.map((file) => [file?._id || file?.document?._id, file])).values()
        );
    
        return uniqueFiles;
      }, [(lead as any)?.offers]);
    
  return (
    <div className="">
    <h4 className="text-xl font-semibold">Documents</h4>
    <DocumentsSectionTable documents={allDocuments} />
  </div>
  );
};

export default DocumentsSectionLeadDetails;