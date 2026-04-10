'use client';

import { useState, useRef, useEffect } from 'react';
import classNames from '@/utils/classNames';
import withHeaderItem from '@/utils/hoc/withHeaderItem';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import ScrollBar from '@/components/ui/ScrollBar';
import navigationIcon from '@/configs/navigation-icon.config';
import { apiGetSearchResult } from '@/services/CommonService';
import debounce from 'lodash/debounce';
import { HiOutlineSearch, HiChevronRight } from 'react-icons/hi';
import { PiMagnifyingGlassDuotone } from 'react-icons/pi';
import Link from 'next/link';
import Highlighter from 'react-highlight-words';

type SearchData = {
  key: string;
  path: string;
  title: string;
  icon: string;
  category: string;
  categoryTitle: string;
};

type SearchResult = {
  title: string;
  data: SearchData[];
};

const recommendedSearch: SearchResult[] = [
  {
    title: 'Recommended',
    data: [],
  },
];

const ListItem = (props: {
  icon: string;
  label: string;
  url: string;
  isLast?: boolean;
  keyWord: string;
  onNavigate: () => void;
}) => {
  const { icon, label, url = '', keyWord, onNavigate } = props;

  return (
    <Link href={url} onClick={onNavigate}>
      <div
        className={classNames(
          'user-select flex cursor-pointer items-center justify-between rounded-xl p-3',
          'hover:bg-gray-100'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={classNames(
              'flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-xl text-gray-900 shadow-xs group-hover:shadow-sm'
            )}
          >
            {icon && navigationIcon[icon]}
          </div>
          <div className="text-gray-900">
            <Highlighter
              autoEscape
              highlightClassName={classNames(
                'text-sand-1',
                'underline bg-transparent font-semibold'
              )}
              searchWords={[keyWord]}
              textToHighlight={label}
            />
          </div>
        </div>
        <HiChevronRight className="text-lg" />
      </div>
    </Link>
  );
};

const SearchBefore = ({ className }: { className?: string }) => {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult[]>(recommendedSearch);
  const [noResult, setNoResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setNoResult(false);
    setSearchResult(recommendedSearch);
    setSearchQuery('');
  };

  const handleSearchOpen = () => {
    setSearchDialogOpen(true);
  };

  const handleSearchClose = () => {
    setSearchDialogOpen(false);
    handleReset();
  };

  const debounceFn = debounce(handleDebounceFn, 500);

  async function handleDebounceFn(query: string) {
    if (!query) {
      setSearchResult(recommendedSearch);
      return;
    }

    if (noResult) {
      setNoResult(false);
    }

    const respond = await apiGetSearchResult<SearchResult[]>({ query });

    if (respond) {
      if (respond.length === 0) {
        setNoResult(true);
      }
      setSearchResult(respond);
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debounceFn(value);
  };

  useEffect(() => {
    if (searchDialogOpen) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [searchDialogOpen]);

  const handleNavigate = () => {
    handleSearchClose();
  };

  return (
    <>
      <div className={classNames(className, 'text-2xl')} onClick={handleSearchOpen}>
        <PiMagnifyingGlassDuotone />
      </div>
      <Dialog
        contentClassName="p-0"
        isOpen={searchDialogOpen}
        closable={false}
        onRequestClose={handleSearchClose}
      >
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center">
              <HiOutlineSearch className="text-xl" />
              <input
                ref={inputRef}
                className="block w-full bg-transparent p-4 text-base text-gray-900 ring-0 outline-hidden"
                placeholder="Search..."
                onChange={handleSearch}
              />
            </div>
            <Button size="xs" onClick={handleSearchClose}>
              Esc
            </Button>
          </div>
          <div className="px-5 py-6">
            <ScrollBar className="max-h-[350px] overflow-y-auto">
              {searchResult?.map((result) => (
                <div key={result?.title} className="mb-4">
                  <h6 className="mb-3">{result?.title}</h6>
                  {result?.data?.map((data, index) => (
                    <ListItem
                      key={data?.title + index}
                      icon={data?.icon}
                      label={data?.title}
                      url={data?.path}
                      keyWord={searchQuery}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              ))}
              {searchResult?.length === 0 && noResult && (
                <div className="my-10 text-center text-lg">
                  <span>No results for </span>
                  <span className="heading-text">
                    {`'`}
                    {searchQuery}
                    {`'`}
                  </span>
                </div>
              )}
            </ScrollBar>
          </div>
        </div>
      </Dialog>
    </>
  );
};

const Search = withHeaderItem(SearchBefore);

export default Search;
