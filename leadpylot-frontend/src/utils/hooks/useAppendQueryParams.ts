'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const useAppendQueryParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onAppendQueryParams = (params: Record<string, string | number | boolean>) => {
    const updatedParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([name, value]) => {
      if (value === '' || value === null || value === undefined) {
        // Remove parameter if value is empty
        updatedParams.delete(name);
      } else {
        // Set parameter if value is not empty
        updatedParams.set(name, String(value));
      }
    });

    const newQueryString = updatedParams.toString();
    // console.log('newQueryString', newQueryString);
    router.push(`${pathname}?${newQueryString}`);
  };

  const removeQueryParams = (paramNames: string[]) => {
    const updatedParams = new URLSearchParams(searchParams.toString());

    paramNames.forEach((name) => {
      updatedParams.delete(name);
    });

    const newQueryString = updatedParams.toString();
    router.push(`${pathname}?${newQueryString}`);
  };

  return { onAppendQueryParams, removeQueryParams };
};

export default useAppendQueryParams;
