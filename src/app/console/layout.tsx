import ConsoleSidebar from '~components/console-sidebar';
import ConsoleNavbar from '~components/console-navbar';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '~server/auth';

const ConsoleLayout = async ({ children }: { children: React.ReactNode }) => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session || session.user.role !== 'admin') {
		redirect('/');
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<ConsoleNavbar />
			<div className="flex pt-14">
				<ConsoleSidebar />
				<main className="flex-1 md:ml-64 p-6 min-h-[calc(100vh-56px)] bg-background">{children}</main>
			</div>
		</div>
	);
};

export default ConsoleLayout;
