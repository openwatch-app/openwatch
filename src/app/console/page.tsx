'use client';

import { Card, CardContent, CardHeader, CardTitle } from '~components/card';
import { Users, Video, MessageSquare, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '~lib/i18n';

const Page = () => {
	const { t } = useTranslation();
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const res = await axios.get('/api/console/stats');
				setStats(res.data);
			} catch (error) {
				console.error('Failed to fetch stats:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchStats();
	}, []);

	if (loading) {
		return <div className="p-8">{t('console.dashboard.loading')}</div>;
	}

	if (!stats) {
		return <div className="p-8">{t('console.dashboard.error')}</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t('console.dashboard.title')}</h1>
				<p className="text-muted-foreground">{t('console.dashboard.description')}</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('console.dashboard.total_users')}</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.users.total}</div>
						<p className="text-xs text-muted-foreground">{t('console.dashboard.active_recently', { count: stats.users.active })}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('console.dashboard.total_videos')}</CardTitle>
						<Video className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.videos.total}</div>
						<p className="text-xs text-muted-foreground">{t('console.dashboard.public_videos', { count: stats.videos.public })}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('console.dashboard.total_views')}</CardTitle>
						<Eye className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.views}</div>
						<p className="text-xs text-muted-foreground">{t('console.dashboard.across_videos')}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('console.dashboard.comments')}</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.comments}</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default Page;
