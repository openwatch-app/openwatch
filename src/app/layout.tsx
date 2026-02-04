import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import type { Metadata } from 'next';
import dayjs from 'dayjs';
import './globals.css';

dayjs.extend(duration);
dayjs.extend(relativeTime);

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
