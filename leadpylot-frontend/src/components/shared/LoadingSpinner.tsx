import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'truck' | 'car' | 'search' | 'email' | 'running' | 'dots' | 'spinner' | 'pulse' | 'bounce';
    className?: string;
    brandText?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'lg',
    className = '',
    // brandText = 'LOADING...'
}) => {
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-24 h-24',
        lg: 'w-32 h-32',
        xl: 'w-40 h-40'
    };

    const renderSpinner = () => {
        return (
            <div className={`${sizeClasses[size]}`}>
                {/* Truck Loader Container */}
                <div className="w-full h-full flex items-center justify-center relative">
                    <div className="w-80 h-24 flex flex-col relative items-center justify-end overflow-x-hidden">
                        {/* Truck Body */}
                        <div className="w-32 h-fit mb-1.5 animate-bounce">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 198 93"
                                className="w-full h-full"
                            >
                                <path
                                    strokeWidth="3"
                                    fill="#62a266"
                                    d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
                                ></path>
                                <path
                                    strokeWidth="3"
                                    stroke="#ffff"
                                    fill="#7D7C7C"
                                    d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
                                ></path>
                                <path
                                    strokeWidth="2"
                                    stroke="#ffff"
                                    fill="#ffff"
                                    d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
                                ></path>
                                <rect
                                    strokeWidth="2"
                                    stroke="#fff"
                                    fill="#FFFCAB"
                                    rx="1"
                                    height="7"
                                    width="5"
                                    y="63"
                                    x="187"
                                ></rect>
                                <rect
                                    strokeWidth="2"
                                    stroke="#bbb"
                                    fill="#ffff"
                                    rx="1"
                                    height="11"
                                    width="4"
                                    y="81"
                                    x="193"
                                ></rect>
                                <rect
                                    strokeWidth="1"
                                    stroke="#282828"
                                    fill="#ffff"
                                    rx="0"
                                    height="90"
                                    width="130"
                                    y="0"
                                    x="0"
                                ></rect>
                                <rect
                                    strokeWidth="2"
                                    stroke="#282828"
                                    fill="#DFDFDF"
                                    rx="2"
                                    height="4"
                                    width="16"
                                    y="84"
                                    x="1"
                                ></rect>
                            </svg>

                            {/* Loading text inside truck body */}
                            <div className="absolute  left-2 top-4 text-center">
                                {/* <div className="text-sm font-bold tracking-widest text-gray-700">{brandText}</div> */}
                                <div className="text-xs font-medium text-gray-600 animate-pulse">Please Wait</div>
                            </div>
                        </div>

                        {/* Truck Tires */}
                        <div className="w-32 h-fit flex items-center justify-between px-2.5 pl-4 absolute bottom-0">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 30 30"
                                className="w-6 h-6"
                            >
                                <circle
                                    strokeWidth="3"
                                    stroke="#282828"
                                    fill="#282828"
                                    r="13.5"
                                    cy="15"
                                    cx="15"
                                ></circle>
                                <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
                            </svg>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 30 30"
                                className="w-6 h-6"
                            >
                                <circle
                                    strokeWidth="3"
                                    stroke="#282828"
                                    fill="#282828"
                                    r="13.5"
                                    cy="15"
                                    cx="15"
                                ></circle>
                                <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
                            </svg>
                        </div>

                        {/* Road */}
                        <div className="w-full h-0.5 bg-gray-800 relative bottom-0 self-end rounded-sm">
                            <div className="absolute w-5 h-full bg-gray-800 -right-1/2 rounded-sm animate-[roadAnimation_1.4s_linear_infinite] border-l-2.5 border-l-white"></div>
                            <div className="absolute w-2.5 h-full bg-gray-800 -right-[65%] rounded-sm animate-[roadAnimation_1.4s_linear_infinite] border-l border-l-white"></div>
                        </div>

                        {/* Lamp Post */}
                        <svg
                            xmlSpace="preserve"
                            viewBox="0 0 453.459 453.459"
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute bottom-0 -right-[90%] h-22 animate-[roadAnimation_1.4s_linear_infinite]"
                            fill="#000000"
                        >
                            <path
                                d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993
c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514
c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16
c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914
h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75
v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795
V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0z
M232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017
h78.747C231.693,100.736,232.77,106.162,232.77,111.694z"
                            ></path>
                        </svg>
                    </div>
                </div>
                {/* Custom CSS for road animation */}
                <style>{`
                            @keyframes roadAnimation {
                                0% {
                                    transform: translateX(0px);
                                }
                                100% {
                                    transform: translateX(-450px);
                                }
                            }
                        `}</style>
            </div>
        );

    };

    return (
        <div className={`${className}`}>
            {renderSpinner()}
        </div>
    );
};

export default LoadingSpinner; 