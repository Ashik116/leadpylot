import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import RichTextEditor from '@/components/shared/RichTextEditor';
import { useNotes } from './useNotes';

interface NotesTabProps {
  leadId: string | undefined;
}

const NotesTab = ({ leadId }: NotesTabProps) => {
  const {
    leadData,
    leadStatus,
    updateLeadMutation,
    handleSaveNotes,
    handleNotesChange,
  } = useNotes(leadId);

  return (
    <div className="flex h-full flex-col p-2">
      <RichTextEditor
        placeholder="Add a note"
        onChange={handleNotesChange}
        content={leadData?.notes || ''}
        editorContentClass="overflow-auto h-[21.8rem]"
        disabled={leadStatus !== 'success'}
      />
      <div className="flex items-center justify-end border-t pt-2">
        <Button
          variant="solid"
          icon={<ApolloIcon name="pen" />}
          loading={updateLeadMutation.isPending}
          onClick={() => handleSaveNotes({ onSuccess: () => { } })}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default NotesTab; 