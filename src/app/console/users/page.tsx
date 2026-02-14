'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '~components/button';
import { Loader2, Upload, Ban, Shield, ShieldAlert } from 'lucide-react';
import { Badge } from '~components/badge';
import { Skeleton } from '~components/skeleton';
import { useTranslation } from '~lib/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ro';

dayjs.extend(relativeTime);

const Page = () => {
	const { t, language } = useTranslation();
	const [users, setUsers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchUsers = async () => {
		try {
			const res = await axios.get('/api/console/users');
			setUsers(res.data);
		} catch (error) {
			console.error('Failed to fetch users:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const handleAction = async (userId: string, action: string, value: any) => {
		try {
			// Optimistic update
			setUsers((prev) =>
				prev.map((u) => {
					if (u.id === userId) {
						if (action === 'ban') return { ...u, banned: value };
						if (action === 'upload') return { ...u, allowedToUpload: value };
						if (action === 'role') return { ...u, role: value };
					}
					return u;
				})
			);

			await axios.patch('/api/console/users', { userId, action, value });
		} catch (error) {
			console.error('Failed to update user:', error);
			// Revert on failure (could implement more robust revert)
			fetchUsers();
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t('console.users.title')}</h1>
					<p className="text-muted-foreground">{t('console.users.description')}</p>
				</div>

				<div className="rounded-md border">
					<table className="w-full text-sm text-left">
						<thead className="bg-muted/50 text-muted-foreground font-medium">
							<tr>
								<th className="p-4">{t('console.users.table.user')}</th>
								<th className="p-4">{t('console.users.table.role')}</th>
								<th className="p-4">{t('console.users.table.status')}</th>
								<th className="p-4">{t('console.users.table.joined')}</th>
								<th className="p-4 text-right">{t('console.users.table.actions')}</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{Array.from({ length: 5 }).map((_, i) => (
								<tr key={i} className="hover:bg-muted/50 transition-colors">
									<td className="p-4">
										<div className="flex flex-col gap-1">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-4 w-48" />
										</div>
									</td>
									<td className="p-4">
										<Skeleton className="h-6 w-16 rounded-full" />
									</td>
									<td className="p-4">
										<Skeleton className="h-6 w-16 rounded-full" />
									</td>
									<td className="p-4">
										<Skeleton className="h-4 w-24" />
									</td>
									<td className="p-4 text-right">
										<div className="flex justify-end gap-2">
											<Skeleton className="h-8 w-8 rounded-md" />
											<Skeleton className="h-8 w-8 rounded-md" />
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t('console.users.title')}</h1>
				<p className="text-muted-foreground">{t('console.users.description')}</p>
			</div>

			<div className="rounded-md border">
				<table className="w-full text-sm text-left">
					<thead className="bg-muted/50 text-muted-foreground font-medium">
						<tr>
							<th className="p-4">{t('console.users.table.user')}</th>
							<th className="p-4">{t('console.users.table.role')}</th>
							<th className="p-4">{t('console.users.table.status')}</th>
							<th className="p-4">{t('console.users.table.joined')}</th>
							<th className="p-4 text-right">{t('console.users.table.actions')}</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{users.map((user) => (
							<tr key={user.id} className="hover:bg-muted/50 transition-colors">
								<td className="p-4">
									<div className="flex flex-col">
										<span className="font-medium">{user.name}</span>
										<span className="text-xs text-muted-foreground">{user.email}</span>
									</div>
								</td>
								<td className="p-4">
									{!user.host ? (
										user.role === 'admin' ? (
											<Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
												{t('console.users.roles.admin')}
											</Badge>
										) : (
											<Badge variant="secondary">{t('console.users.roles.user')}</Badge>
										)
									) : (
										<span className="text-xs text-muted-foreground">-</span>
									)}
								</td>
								<td className="p-4">
									<div className="flex flex-col gap-1 items-start">
										{user.host && (
											<Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
												{t('console.users.status.external')}
												{user.host && <span className="ml-1 opacity-70">({user.host})</span>}
											</Badge>
										)}
										{user.banned && (
											<Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
												{t('console.users.status.banned')}
											</Badge>
										)}
										{!user.allowedToUpload && (
											<Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
												{t('console.users.status.upload_restricted')}
											</Badge>
										)}
										{!user.banned && user.allowedToUpload && !user.host && (
											<Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
												{t('console.users.status.active')}
											</Badge>
										)}
									</div>
								</td>
								<td className="p-4 text-muted-foreground">
									{user.createdAt
										? dayjs(user.createdAt)
												.locale(language === 'ro' ? 'ro' : 'en')
												.fromNow()
										: '-'}
								</td>
								<td className="p-4 text-right">
									{!user.host ? (
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleAction(user.id, 'upload', !user.allowedToUpload)}
												title={user.allowedToUpload ? t('console.users.actions.disable_uploads') : t('console.users.actions.enable_uploads')}
											>
												<Upload className={`h-4 w-4 ${user.allowedToUpload ? 'text-green-600' : 'text-muted-foreground'}`} />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleAction(user.id, 'ban', !user.banned)}
												title={user.banned ? t('console.users.actions.unban') : t('console.users.actions.ban')}
											>
												<Ban className={`h-4 w-4 ${user.banned ? 'text-orange-600' : 'text-muted-foreground'}`} />
											</Button>
											{user.role !== 'admin' && (
												<Button variant="ghost" size="icon" onClick={() => handleAction(user.id, 'role', 'admin')} title={t('console.users.actions.promote')}>
													<Shield className="h-4 w-4 text-muted-foreground hover:text-purple-600" />
												</Button>
											)}
											{user.role === 'admin' && (
												<Button variant="ghost" size="icon" onClick={() => handleAction(user.id, 'role', 'user')} title={t('console.users.actions.demote')}>
													<ShieldAlert className="h-4 w-4 text-purple-600" />
												</Button>
											)}
										</div>
									) : (
										<span className="text-xs text-muted-foreground italic">{t('console.users.actions.no_actions')}</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default Page;
