'use client';
import { ReactNode } from 'react';
import { AuthSidebar } from '@/components/auth/sidebar/AuthSidebar';
import { AuthSidebarProvider } from '@/contexts/AuthSidebarContext';

const LayoutContent = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative grid h-screen flex-auto xl:grid-cols-2">
      {/* Sidebar on the left */}
      <div className="relative col-span-1 hidden xl:block">
        {/* <img
          src="/img/others/auth-side-bg.png"
          className="absolute top-0 left-0 h-full rounded-3xl scale-x-[-1] opacity-15 w-full"
          alt="auth-side-bg"
        /> */}
        <AuthSidebar />
      </div>

      {/* Form on the right */}
      <div className="col-span-1 flex flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-[380px] px-8 xl:max-w-[450px]">{children}</div>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <AuthSidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthSidebarProvider>
  );
};

export default Layout;
