'use client';

import { Card, CardContent, CardHeader, CardTitle } from '~components/card';
import { Users, Video, MessageSquare, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

const Page = () => {
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
		return <div className="p-8">Loading stats...</div>;
	}

	if (!stats) {
		return <div className="p-8">Failed to load stats.</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">Platform overview and statistics.</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.users.total}</div>
						<p className="text-xs text-muted-foreground">{stats.users.active} active recently</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Videos</CardTitle>
						<Video className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.videos.total}</div>
						<p className="text-xs text-muted-foreground">{stats.videos.public} public videos</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Views</CardTitle>
						<Eye className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.views}</div>
						<p className="text-xs text-muted-foreground">Across all videos</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Comments</CardTitle>
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
