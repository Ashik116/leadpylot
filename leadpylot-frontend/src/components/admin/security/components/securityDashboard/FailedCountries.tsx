import Card from '@/components/ui/Card';
import { HiGlobeAlt } from 'react-icons/hi';

const FailedCountries = ({ stats }: { stats: any }) => {
  return (
    <Card>
      <div className="border-b border-gray-200 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HiGlobeAlt className="h-5 w-5 text-blue-500" />
          Top Failed Countries
        </h3>
      </div>
      <div className="p-4">
        {stats?.topFailedCountries && stats?.topFailedCountries?.length > 0 ? (
          <div className="space-y-3">
            {stats?.topFailedCountries?.slice(0, 5)?.map((country: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-8 items-center justify-center rounded bg-gray-200 text-xs font-bold">
                    {country?._id?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <span className="font-medium text-gray-900">{country?._id || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded bg-red-100 px-2 py-1 text-sm font-medium text-red-700">
                    {country?.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">No failed attempts data</p>
        )}
      </div>
    </Card>
  );
};

export default FailedCountries;
