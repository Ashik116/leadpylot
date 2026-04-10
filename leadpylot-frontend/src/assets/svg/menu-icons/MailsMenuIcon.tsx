const MailsMenuIcon = ({
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
        id="path1707"
        className="menu-icon-svg"
        d="M501.8 88.9H60.86c-24.25 0-44.09 19.84-44.09 44.09v299.84c0 24.25 19.84 44.09 44.09 44.09H501.8c24.25 0 44.09-19.84 44.09-44.09V133c0-24.25-19.84-44.09-44.09-44.09z"
      />
      <path
        id="path1711"
        className="menu-icon-svg"
        d="M545.89 141.82L318.02 293.74c-20.18 13.45-53.2 13.45-73.38 0L16.77 141.82"
      />
      <path className="menu-icon-svg" d="M346.76 282.91L504.31 476.86" />
      <path className="menu-icon-svg" d="M70.06 476.93L230.2 284.1" />
    </svg>
  );
};

export default MailsMenuIcon;
