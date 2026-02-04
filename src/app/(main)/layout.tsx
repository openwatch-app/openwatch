import MainLayout from '~components/main-layout';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
	return <MainLayout>{children}</MainLayout>;
};

export default AppLayout;
