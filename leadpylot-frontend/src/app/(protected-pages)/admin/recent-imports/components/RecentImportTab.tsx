import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

type TTabProps = {
    isOffersTab: boolean;
    handleTabChange: (isOffers: boolean) => void;

}

const RecentImportTab = ({ isOffersTab, handleTabChange }: TTabProps) => {

    return (
        <div className="relative bg-gray-50 rounded-xl p-0.5 text-xs">
            {/* Animated Background Slider */}
            <div
                className={`absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${isOffersTab ? 'left-1 right-1 translate-x-full' : 'left-1 right-1'
                    }`}
                style={{ width: 'calc(50% - 4px)' }}
            />

            <div className="relative flex text-xs">
                <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    clickFeedback={false}
                    iconAlignment="start"
                    gapClass="gap-1.5"
                    icon={
                        <ApolloIcon
                            name="file"
                            className={`text-xs transition-all duration-300 ${!isOffersTab ? 'text-blue-500' : 'text-gray-400'}`}
                        />
                    }
                    className={`relative z-10 flex-1 min-w-0 !justify-center !rounded-md !px-1.5 !py-0.5 !text-xs !font-medium transition-all duration-300 ease-out ${!isOffersTab
                        ? '!text-evergreen !bg-white shadow-sm'
                        : '!text-gray-600 hover:!text-gray-800 hover:!bg-gray-100'
                        }`}
                    onClick={() => handleTabChange(false)}
                >
                    <span className="whitespace-nowrap">Leads Imports</span>
                </Button>

                <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    clickFeedback={false}
                    iconAlignment="start"
                    gapClass="gap-1.5"
                    icon={
                        <ApolloIcon
                            name="menu"
                            className={`text-xs transition-all duration-300 ${isOffersTab ? 'text-blue-500' : 'text-gray-400'}`}
                        />
                    }
                    className={`relative z-10 flex-1 min-w-0 !justify-center !rounded-md !px-1.5 !py-0.5 !text-xs !font-medium transition-all duration-300 ease-out ${isOffersTab
                        ? '!text-evergreen !bg-white shadow-sm'
                        : '!text-gray-600 hover:!text-gray-800 hover:!bg-gray-100'
                        }`}
                    onClick={() => handleTabChange(true)}
                >
                    <span className="whitespace-nowrap">Offers Imports</span>
                </Button>
            </div>
        </div>
    );
};

export default RecentImportTab;