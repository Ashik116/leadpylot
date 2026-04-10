import ApolloIcon from '@/components/ui/ApolloIcon';

const OfferCounter = ({ totalOffers }: { totalOffers: number }) => {
  return (
    <div className="flex items-center justify-between">
    <ApolloIcon name="file-alt" className="text-evergreen" />
    <p className="text-sm">Offers : </p>
    <span className="bg-ocean-2/10 text-ocean-2 ml-1 rounded-md px-2 text-sm">
      {' '}
      {totalOffers || 0}
    </span>
  </div>
  );
};

export default OfferCounter;