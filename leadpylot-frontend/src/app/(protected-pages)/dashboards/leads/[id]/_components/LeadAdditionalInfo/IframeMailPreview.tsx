import classNames from '@/utils/classNames';

const IframeMailPreview = ({
  previewContent,
  className,
}: {
  previewContent: string;
  className?: string;
}) => {
  return (
    <iframe
      srcDoc={`
          <html>
            <head>
              <style>
                body { 
                  margin: 0; 
                  overflow: hidden;
                  box-sizing: border-box;
                }
                * { 
                  box-sizing: border-box; 
                }
                ::-webkit-scrollbar {
                  display: none;
                }
                -ms-overflow-style: none;
                scrollbar-width: none;
              </style>
            </head>
            <body>${previewContent}</body>
          </html>
        `}
      className={classNames('h-full w-full border-0', className)}
      style={{
        overflow: 'hidden',
      }}
    />
  );
};
export default IframeMailPreview;
