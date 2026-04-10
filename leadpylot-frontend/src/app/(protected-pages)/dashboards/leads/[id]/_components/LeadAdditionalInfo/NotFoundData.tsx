const NotFoundData = ({ message = 'No data available for this lead.' }: { message?: string }) => {
    return (
        <div className="py-8 text-center text-gray-500">{message}</div>
    );
};

export default NotFoundData;