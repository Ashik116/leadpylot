import React from 'react';
import Upload from '@/components/ui/Upload';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import { EmailTemplate } from '@/services/SettingsService';
import Image from 'next/image';
import { getImageUrl } from '@/utils/utils';

interface SignatureUploaderProps {
  initialData?: EmailTemplate & { has_signature_file?: boolean; signature_url?: string };
  signatureFile: File | null;
  setSignatureFile: (file: File | null) => void;
  onFileChange: (hasFile: boolean) => void;
}

export const SignatureUploader: React.FC<SignatureUploaderProps> = ({
  initialData,
  signatureFile,
  setSignatureFile,
  onFileChange,
}) => {
  const maxUpload = 1;
  const allowedFileType = ['image/jpeg', 'image/png'];
  const maxFileSize = 500000;

  const beforeUpload = (files: FileList | null, fileList: File[]) => {
    let valid: string | boolean = true;

    if (fileList.length >= maxUpload) {
      return `You can only upload ${maxUpload} file`;
    }

    if (files) {
      for (const f of files) {
        if (!allowedFileType.includes(f.type)) {
          valid = 'Please upload a .jpeg or .png file!';
        }

        if (f.size >= maxFileSize) {
          valid = 'Upload image cannot more then 500kb!';
        }
      }
    }

    return valid;
  };

  const handleFileUpload = (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      setSignatureFile(file);
      onFileChange(true);
    }
  };

  const handleFileRemove = () => {
    setSignatureFile(null);
    onFileChange(false);
  };

  const tip = <p className="mt-2">jpeg or png only (max 500kb)</p>;

  // Construct image URL properly

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">Email Signature</label>
      <Upload
        beforeUpload={beforeUpload}
        uploadLimit={maxUpload}
        tip={tip}
        onChange={handleFileUpload}
        disabled={signatureFile ? true : false}
        onFileRemove={handleFileRemove}
        fileList={signatureFile ? [signatureFile] : []}
      >
        <Button icon={<ApolloIcon name="upload" />}>
          {signatureFile ? 'Change Email Signature' : 'Upload Email Signature'}
        </Button>
      </Upload>
      {signatureFile && (
        <div className="mt-2 text-sm text-gray-600">
          Selected file: {signatureFile.name} ({(signatureFile.size / 1024).toFixed(1)} KB)
        </div>
      )}
      {/* update signature Image preview */}
      {initialData?.has_signature_file && !signatureFile && (
        <div className={classNames('upload-file')}>
          <div className="flex items-center">
            <div className="upload-file-thumbnail">
              <Image
                src={getImageUrl(initialData?.signature_url || '')}
                alt="Email signature photo"
                className="h-full w-full object-cover"
                width={100}
                height={100}
                unoptimized
              />
            </div>
            <div className="upload-file-info">
              <h6 className="upload-file-name text-sm font-bold">Uploaded Email Signature</h6>
              <span className="upload-file-size">Size not more than 500kb</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
