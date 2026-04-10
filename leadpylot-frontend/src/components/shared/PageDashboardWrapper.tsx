import { Card } from '../ui';

interface props {
  pageTitle?: string;
  children?: React.ReactNode;
  subTitle?: string;
}

const PageDashboardWrapper = ({ children }: props) => {
  return (
    <>
      <Card>
        {children}
      </Card>
    </>
  );
};

export default PageDashboardWrapper;
