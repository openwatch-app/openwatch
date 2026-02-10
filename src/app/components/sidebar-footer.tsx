import { useEffect, useState } from 'react';
import { useTranslation } from '~lib/i18n';
import Link from 'next/link';
import axios from 'axios';

const SideBarFooter = () => {
	const { t } = useTranslation();
	const [latestVersion, setLatestVersion] = useState<string | null>(null);
	const currentVersion = (process.env.NEXT_PUBLIC_APP_VERSION as string) || '0.0.0';

	const isLatest = latestVersion ? currentVersion.replace('v', '') === latestVersion.replace('v', '') : true;

	useEffect(() => {
		const checkVersion = async () => {
			try {
				const response = await axios.get('https://raw.githubusercontent.com/openwatch-app/openwatch/refs/heads/main/package.json');
				if (response.data && response.data.version) {
					setLatestVersion(response.data.version);
				}
			} catch (e) {
				console.error('Error fetching version:', e);
			}
		};

		checkVersion();
	}, []);

	return (
		<div className="p-4 mt-auto border-t bg-card/30 backdrop-blur-[2px]">
			<div className="flex flex-col gap-3">
				<Link
					className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
					href="https://github.com/openwatch-app/openwatch/issues/new"
					rel="noopener noreferrer"
					target="_blank"
				>
					<span className="w-1.5 h-1.5 rounded-full bg-red-500/70 group-hover:bg-red-500 transition-colors" />
					{t('sidebar.report_bug')}
				</Link>

				<div className="text-xs text-muted-foreground">
					{t('sidebar.powered_by')}{' '}
					<Link
						href="https://github.com/openwatch-app/openwatch"
						className="text-foreground font-medium hover:underline decoration-border underline-offset-2"
						target="_blank"
						rel="noopener noreferrer"
					>
						OpenWatch
					</Link>
				</div>

				<div className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5 font-mono">
					<span>v{currentVersion}</span>
					{latestVersion && !isLatest ? (
						<span className="text-amber-500/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-[4px] text-[9px] border border-amber-500/20">
							{t('sidebar.update')}: {latestVersion}
						</span>
					) : (
						<span className="text-emerald-500/60 ml-1">• {t('sidebar.latest')}</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default SideBarFooter;
