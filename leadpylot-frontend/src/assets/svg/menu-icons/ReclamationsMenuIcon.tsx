const ReclamationsMenuIcon = ({
  height = 14,
  width = 14,
}: {
  height?: number | string;
  width?: number | string;
}) => {
  return (
    <svg
      id="fi_590501"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560.23 565.83"
      width={width}
      height={height}
    >
      <path
        className="menu-icon-svg"
        d="M258.77 474.12c-61.27 0-116.94-24.06-158.03-63.23C56.97 369.16 29.7 310.3 29.7 245.06c0-126.52 102.56-229.08 229.07-229.08s229.06 102.56 229.06 229.07c0 51.13-13.33 91.98-41.65 130.1"
      />
      <circle
        cx={258.77}
        cy={185.67}
        r={75.6}
        strokeWidth="38px"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={387.08}
        cy={486.39}
        r={21.64}
        strokeWidth="18px"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="menu-icon-svg"
        d="M258.77 474.12c-61.27 0-116.94-24.06-158.03-63.23 6.71-81.4 74.9-145.37 158.03-145.37 39.94 0 76.44 14.77 104.32 39.14M372.31 293.37L235.32 525.43c-5.4 9.15 1.2 20.71 11.82 20.71h273.98c10.63 0 17.23-11.56 11.82-20.71L395.95 293.37c-5.31-9-18.33-9-23.65 0z"
      />
      <path
        fillRule="evenodd"
        strokeWidth="18px"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M395.45 464.74L378.72 464.74 368.66 362.61 405.51 362.61 395.45 464.74z"
      />
    </svg>
  );
};

export default ReclamationsMenuIcon;
