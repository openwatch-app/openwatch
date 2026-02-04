import { auth } from '~server/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import ConsoleNavbar from '~components/console-navbar';
import ConsoleSidebar from '~components/console-sidebar';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
	const session = await auth.api.getSession({
		headers: await headers()
	});

	if (!session || (session.user as any).role !== 'admin') {
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
}
