'use client';

import Link from 'next/link';
import Container from '@/components/shared/Container';
import NotFound404 from '@/assets/svg/NotFound404';
import appConfig from '@/configs/app.config';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-auto flex-col">
      <div className="h-full bg-white">
        <Container className="flex h-full min-w-0 flex-auto flex-col items-center justify-center">
          <div className="max-w-[500px] min-w-[320px] md:min-w-[500px]">
            <div className="text-center">
              <div className="mb-10 flex justify-center">
                <NotFound404 height={350} width={350} />
              </div>
              <h2>Ops! Page not found</h2>
              <p className="mt-6 text-lg">
                This page does not exist or has been removed, We suggest you to go back to the home
                page
              </p>
              <div className="mt-8">
                <Link
                  href={appConfig.authenticatedEntryPath}
                  className="button ring-sand-1 hover:border-sand-1 hover:text-sand-1 button-press-feedback inline-flex h-14 items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-2 text-base text-gray-600 hover:ring-1"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
