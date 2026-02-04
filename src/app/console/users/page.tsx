'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '~components/button';
import { Loader2, Upload, Ban, Shield, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UsersPage() {
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
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Users</h1>
				<p className="text-muted-foreground">Manage platform users and permissions.</p>
			</div>

			<div className="rounded-md border">
				<table className="w-full text-sm text-left">
					<thead className="bg-muted/50 text-muted-foreground font-medium">
						<tr>
							<th className="p-4">User</th>
							<th className="p-4">Role</th>
							<th className="p-4">Status</th>
							<th className="p-4">Joined</th>
							<th className="p-4 text-right">Actions</th>
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
									<span
										className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
											user.role === 'admin' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
										}`}
									>
										{user.role}
									</span>
								</td>
								<td className="p-4">
									<div className="flex flex-col gap-1 items-start">
										{user.banned && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium">Banned</span>}
										{!user.allowedToUpload && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium">Upload Restricted</span>}
										{!user.banned && user.allowedToUpload && <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium">Active</span>}
									</div>
								</td>
								<td className="p-4 text-muted-foreground">{user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '-'}</td>
								<td className="p-4 text-right">
									<div className="flex justify-end gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleAction(user.id, 'upload', !user.allowedToUpload)}
											title={user.allowedToUpload ? 'Disable Uploads' : 'Enable Uploads'}
										>
											<Upload className={`h-4 w-4 ${user.allowedToUpload ? 'text-green-600' : 'text-muted-foreground'}`} />
										</Button>
										<Button variant="ghost" size="icon" onClick={() => handleAction(user.id, 'ban', !user.banned)} title={user.banned ? 'Unban User' : 'Ban User'}>
											<Ban className={`h-4 w-4 ${user.banned ? 'text-orange-600' : 'text-muted-foreground'}`} />
										</Button>
										{user.role !== 'admin' && (
											<Button variant="ghost" size="icon" onClick={() => handleAction(user.id, 'role', 'admin')} title="Promote to Admin">
												<Shield className="h-4 w-4 text-muted-foreground hover:text-purple-600" />
											</Button>
										)}
										{user.role === 'admin' && (
											<Button variant="ghost" size="icon" onClick={() => handleAction(user.id, 'role', 'user')} title="Demote to User">
												<ShieldAlert className="h-4 w-4 text-purple-600" />
											</Button>
										)}
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
