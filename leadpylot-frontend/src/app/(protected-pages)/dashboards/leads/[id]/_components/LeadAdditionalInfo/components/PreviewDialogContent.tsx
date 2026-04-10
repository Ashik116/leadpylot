'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
const RichTextEditor = dynamic(
  () => import('@/components/shared/rich-text-editor').then((mod) => mod.RichTextEditor),
  { ssr: false }
);
interface PreviewDialogContentProps {
  content: string;
  onContentChange: (html: string) => void;
  onClose: () => void;
  editorRefCallback?: (editor: any) => void;
}

export const PreviewDialogContent: React.FC<PreviewDialogContentProps> = ({
  content,
  onContentChange,
  editorRefCallback,
}) => {
  const methods = useForm({
    defaultValues: { body: content },
  });
  const isFromParentSync = useRef(false);

  useEffect(() => {
    const currentBody = methods.getValues('body') ?? '';
    if (content === currentBody) return;
    methods.reset({ body: content });
    isFromParentSync.current = true;
  }, [content, methods]);

  const watchedBody = useWatch({
    control: methods.control,
    name: 'body',
    defaultValue: content,
  });

  useEffect(() => {
    if (isFromParentSync.current) {
      isFromParentSync.current = false;
      return;
    }
    onContentChange(watchedBody ?? '');
  }, [watchedBody, onContentChange]);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mb-1 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <p className="text-slate-600">Editable Template Source</p>
        <span className="text-slate-400">Changes are saved automatically</span>
      </div>
      <FormProvider {...methods}>
        <RichTextEditor
          editorRef={editorRefCallback ?? undefined}
          name="body"
          height={410}
          className="min-h-[50vh] overflow-y-auto"
        />
      </FormProvider>
    </div>
  );
};

export default PreviewDialogContent;
