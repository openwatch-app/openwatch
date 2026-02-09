import { PWARegister } from './components/pwa-register';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Metadata, Viewport } from 'next';
import duration from 'dayjs/plugin/duration';
import dayjs from 'dayjs';
import './globals.css';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const metadata: Metadata = {
	title: 'OpenWatch',
	description: 'An open-source alternative to YouTube.',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'OpenWatch'
	},
	formatDetection: {
		telephone: false
	}
};

export const viewport: Viewport = {
	themeColor: '#0f0f0f',
	width: 'device-width',
	initialScale: 1.0,
	minimumScale: 1.0,
	maximumScale: 1.0,
	userScalable: false
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
	return (
		<html lang="en" className="dark">
			<body className={`antialiased overflow-x-hidden`}>
				{children}
				<PWARegister />
			</body>
		</html>
	);
};

export default RootLayout;
