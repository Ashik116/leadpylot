const useIsClient = () => {
  return typeof window !== 'undefined';
};

export default useIsClient;
