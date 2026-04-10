import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormItem from '@/components/ui/Form/FormItem';
import Select from '@/components/ui/Select';
import { useState } from 'react';
import { LuPaperclip, LuSave } from 'react-icons/lu';
import RichTextEditor from '@/components/shared/RichTextEditor/RichTextEditor';

interface NoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: string, content: string) => void;
  initialSubject?: string;
  initialContent?: string;
  isLeadsDashboard?: boolean;
}

export default function NoteDialog({
  isOpen,
  onClose,
  onSave,
  initialSubject = '',
  initialContent = '',
  isLeadsDashboard,
}: NoteDialogProps) {
  const [noteSubject, setNoteSubject] = useState<string>(initialSubject);
  const [noteContent, setNoteContent] = useState<string>(initialContent);

  const handleSaveNote = () => {
    onSave(noteSubject, noteContent);
  };

  const handleEditorChange = ({ html }: { text: string; html: string; json: any }) => {
    setNoteContent(html);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={700}>
      <h4 className="mb-4">Log note</h4>
      <div className="mb-4">
        <FormItem label="Subject">
          <Input
            className="w-full"
            value={noteSubject}
            onChange={(e) => setNoteSubject(e.target.value)}
          />
        </FormItem>
      </div>
      <div className="mb-6">
        <RichTextEditor onChange={handleEditorChange} content={noteContent} />
        <div className="flex justify-end">
          <Button icon={<LuPaperclip />} variant="plain" size="sm">
            Attachments
          </Button>
        </div>
        {isLeadsDashboard && (
          <FormItem label="Load template">
            <Select />
          </FormItem>
        )}
      </div>
      <div className="flex justify-between">
        <div className="flex items-center">
          <Button icon={<LuSave />}>Save Template</Button>
        </div>
        <div className="flex gap-4">
          <Button variant="destructive" onClick={onClose}>
            Discard
          </Button>
          <Button variant="solid" onClick={handleSaveNote}>
            Log
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
