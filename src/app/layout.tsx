import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'OpenWatch',
	description: 'A YouTube clone built with Next.js and shadcn/ui'
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
	return (
		<html lang="en" className="dark">
			<body className={`antialiased`}>{children}</body>
		</html>
	);
};

export default RootLayout;
