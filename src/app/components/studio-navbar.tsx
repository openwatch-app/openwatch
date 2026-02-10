'use client';

import { Menu, Video, PlusSquare } from 'lucide-react';
import { UploadDialog } from './upload-dialog';
import { authClient } from '~lib/auth-client';
import UserDropdown from './user-dropdown';
import { useAppStore } from '~lib/store';
import { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import Link from 'next/link';
import { useTranslation } from '~lib/i18n';

const StudioNavbar = () => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const { toggleSidebar } = useAppStore();
	const [uploadOpen, setUploadOpen] = useState(false);

	const currentUser = session?.user;
	const canUpload = (currentUser as any)?.allowedToUpload !== false;

	return (
		<nav className="fixed top-0 left-0 right-0 h-14 bg-background z-50 flex items-center justify-between px-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 md:hidden">
					<Menu className="h-5 w-5" />
				</Button>
				<Link href="/" className="flex items-center gap-1">
					<div className="bg-primary text-white p-1 rounded-lg">
						<Video className="h-4 w-4 fill-current" />
					</div>
					<span className="text-xl font-bold tracking-tighter">{t('studio.title')}</span>
					<Badge variant="secondary" className="text-[10px] px-1.5 h-5 rounded-full uppercase">
						{t('common.beta')}
					</Badge>
				</Link>
			</div>

			<div className="flex items-center gap-2">
				{canUpload && (
					<Button
						variant="ghost"
						size="icon"
						className="hidden sm:flex text-primary font-medium w-auto px-2 gap-1 border border-primary/20 bg-primary/10 hover:bg-primary/20"
						onClick={() => setUploadOpen(true)}
					>
						<PlusSquare className="h-4 w-4" />
						<span className="text-xs uppercase tracking-wide">{t('common.create')}</span>
					</Button>
				)}

				{currentUser && <UserDropdown user={currentUser} />}
			</div>
			<UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
		</nav>
	);
};

export default StudioNavbar;
