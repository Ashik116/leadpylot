const HideActions = ({ sharedDataTable = false, children }: { sharedDataTable: boolean, children: React.ReactNode }) => {
    return (
        <div>
            {sharedDataTable ? <></> : children}
        </div>
    );
};

export default HideActions;