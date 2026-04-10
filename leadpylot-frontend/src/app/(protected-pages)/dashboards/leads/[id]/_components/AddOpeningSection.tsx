import Button from '@/components/ui/Button';
import Form from '@/components/ui/Form/Form';
import FormItem from '@/components/ui/Form/FormItem';
import Select from '@/components/ui/Select';
import CloseButton from '@/components/ui/CloseButton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import { TLead } from '@/services/LeadsService';
import { useLeadConditional } from '@/services/hooks/useLeads';
import { useCreateOpening } from '@/services/hooks/useOpenings';
import { OpeningFileType } from '@/services/OpeningsService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

interface Props {
  uploadedFiles: Array<{ file: File; type: OpeningFileType }>;
  setUploadedFiles: (files: Array<{ file: File; type: OpeningFileType }>) => void;
  leadId: string;
  lead?: TLead;
  setIsAddOpeningOpen: (open: boolean) => void;
}

// Define the form schema using Zod
const formSchema = z.object({
  offer_id: z.string(),
  files: z
    .array(
      z.object({
        file: z.instanceof(File),
        type: z.enum(['contract', 'id', 'extra', 'sign']),
      })
    )
    .min(1, 'At least one file is required'),
});

// TypeScript type derived from the schema
type FormValues = z.infer<typeof formSchema>;

export default function AddOpeningSection({
  uploadedFiles,
  setUploadedFiles,
  leadId,
  lead: leadProp,
  setIsAddOpeningOpen,
}: Props) {
  const [isFileTypeDialogOpen, setIsFileTypeDialogOpen] = useState(false);
  const [tempFile, setTempFile] = useState<File | null>(null);

  // Initialize React Hook Form with Zod validation
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const queryClient = useQueryClient();

  const createOpeningMutation = useCreateOpening({
    onSuccess: () => {
      setIsAddOpeningOpen(false);
      setUploadedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });

  const handleOnDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles?.length === 0) return;

    // Always open dialog to select file type
    setTempFile(acceptedFiles[0]);
    setIsFileTypeDialogOpen(true);
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, isFocused } =
    useDropzone({
      onDrop: handleOnDrop,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
      },
      maxFiles: 1,
      noClick: false,
    });

  const dropzoneStyle = useMemo(() => {
    const baseStyle =
      'mb-4 border-2 border-border border-dashed p-6 rounded-lg text-center cursor-pointer transition-all duration-200';
    const acceptStyle = 'border-green-600 bg-green-200';
    const activeStyle = acceptStyle;
    const focusedStyle = acceptStyle;
    const rejectStyle = 'border-red-500 bg-red-50';

    if (isDragAccept) {
      return `${baseStyle} ${acceptStyle}`;
    }
    if (isDragReject) {
      return `${baseStyle} ${rejectStyle}`;
    }
    if (isDragActive) {
      return `${baseStyle} ${activeStyle}`;
    }
    if (isFocused) {
      return `${baseStyle} ${focusedStyle}`;
    }
    return `${baseStyle} border-gray-300`;
  }, [isDragActive, isDragAccept, isDragReject, isFocused]);

  const handleSelectFileType = (fileType: OpeningFileType) => {
    if (tempFile) {
      const newFiles = [...uploadedFiles, { file: tempFile, type: fileType }];
      setUploadedFiles(newFiles);
      // Update form value
      setValue('files', newFiles);
      // Trigger validation
      trigger('files');
      setTempFile(null);
      setIsFileTypeDialogOpen(false);
    }
  };

  const handleCloseFileTypeDialog = () => {
    setTempFile(null);
    setIsFileTypeDialogOpen(false);
  };

  const onSubmit = (data: FormValues) => {
    createOpeningMutation.mutate({
      offer_id: data?.offer_id,
      files: data?.files?.length > 0 ? data?.files?.map((file) => file?.file) : [],
      documentTypes: data?.files?.length > 0 ? data?.files?.map((file) => file?.type) : [],
    });
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const newFiles = uploadedFiles?.filter((_, index) => index !== indexToRemove);
    setUploadedFiles(newFiles);
    // Update form value
    setValue('files', newFiles);
    // Trigger validation
    trigger('files');
  };

  const { data: leadFromQuery } = useLeadConditional(leadId, !leadProp);
  const lead = leadProp ?? leadFromQuery;

  const offers = useMemo(() => {
    if (!lead?.project?.[0]?.agent?.offers) return [];

    return (
      lead?.project?.[0]?.agent?.offers?.map((offer) => ({
        ...offer,
        agent_name: lead?.project?.[0]?.agent?.login,
        project_name: lead?.project?.[0]?.name,
      })) || []
    );
  }, [lead]);

  return (
    <Dialog isOpen={true} onClose={() => setIsAddOpeningOpen(false)} width={600} closable={false}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4 flex items-center justify-between">
          <h4>Add Opening</h4>
          <CloseButton onClick={() => setIsAddOpeningOpen(false)} />
        </div>
        <FormItem
          label="Offer"
          invalid={!!errors?.offer_id}
          errorMessage={errors?.offer_id?.message}
        >
          <Controller
            name="offer_id"
            control={control}
            render={({ field }) => (
              <Select
                options={offers?.map((offer) => ({
                  label: `${offer?.project_name}, ${offer?.agent_name}, ${offer?.payment_terms?.name}, ${offer?.bonus_amount?.name}`,
                  value: offer?._id,
                }))}
                onChange={(option: any) => field.onChange(option?.value || '')}
              />
            )}
          />
        </FormItem>
        <p className="mb-2">Attachment Files</p>
        <div {...getRootProps()} className={dropzoneStyle}>
          <input {...getInputProps()} />
          <ApolloIcon
            name="upload"
            className="mx-auto mb-2 h-8 w-8 text-xl font-bold text-gray-500"
          />
          <p>Drag and drop files here, or click to select files</p>
          <p className="text-sm text-gray-500">Only image files are supported</p>
        </div>
        <div className="mt-4 mb-4">
          {uploadedFiles?.length > 0 && (
            <ul>
              {uploadedFiles?.map((item, index) => (
                <li key={index} className="flex items-center justify-between rounded p-2">
                  <div className="flex items-center gap-4">
                    {/* <LuFile size={24} /> */}
                    <ApolloIcon name="file" />
                    <span className="font-semibold">{item?.file?.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {item?.type}
                    </span>
                  </div>
                  <Button
                    size="xs"
                    onClick={() => handleRemoveFile(index)}
                    icon={<ApolloIcon name="trash" />}
                  ></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors?.files && <p className="mt-2 text-sm text-red-500">{errors?.files?.message}</p>}
        <div className="mt-4 flex justify-end">
          <Button
            variant="solid"
            type="submit"
            loading={createOpeningMutation.isPending || isSubmitting}
            disabled={
              uploadedFiles?.length === 0 || createOpeningMutation?.isPending || isSubmitting
            }
          >
            Save
          </Button>
        </div>
        <Dialog isOpen={isFileTypeDialogOpen} onClose={handleCloseFileTypeDialog} width={400}>
          <h3 className="text-lg font-medium">Select file type</h3>
          <p className="mb-4">Which type of file is &ldquo;{tempFile?.name}&rdquo;?</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => handleSelectFileType('contract')}>
              Contract File
            </Button>
            <Button size="sm" onClick={() => handleSelectFileType('id')}>
              ID File
            </Button>
            <Button size="sm" onClick={() => handleSelectFileType('extra')}>
              Extra File
            </Button>
          </div>
        </Dialog>
      </Form>
    </Dialog>
  );
}
