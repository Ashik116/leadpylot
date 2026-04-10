export default function ImageIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="none"
            aria-label="Image"
            role="img"
            {...props}
        >
            <title>Image</title>
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M1 1H15V15H1V1ZM6 9L8 11L13 6V13H3V12L6 9ZM6.5 7C7.32843 7 8 6.32843 8 5.5C8 4.67157 7.32843 4 6.5 4C5.67157 4 5 4.67157 5 5.5C5 6.32843 5.67157 7 6.5 7Z"
                    fill="#2750F5"
                />
            </g>
        </svg>
    )
}
