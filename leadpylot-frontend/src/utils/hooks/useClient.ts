const useClient = () => {
  return typeof window !== 'undefined';
};

export default useClient;
