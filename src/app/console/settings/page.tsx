'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~components/card';
import { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const Page = () => {
	const [settings, setSettings] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const res = await axios.get('/api/console/settings');
				setSettings(res.data);
			} catch (error) {
				console.error('Failed to fetch settings:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchSettings();
	}, []);

	const updateSetting = async (key: string, value: string) => {
		try {
			// Optimistic update
			setSettings((prev) => ({ ...prev, [key]: value }));
			await axios.post('/api/console/settings', { key, value });
		} catch (error) {
			console.error('Failed to update setting:', error);
			// Could revert here
		}
	};

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const registrationEnabled = settings['registration_enabled'] !== 'false';
	const uploadEnabled = settings['upload_enabled'] !== 'false';

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
				<p className="text-muted-foreground">Configure global platform settings.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Registration</CardTitle>
					<CardDescription>Control whether new users can sign up for the platform.</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between">
					<div className="space-y-0.5">
						<div className="font-medium">Enable Registration</div>
						<div className="text-sm text-muted-foreground">{registrationEnabled ? 'Anyone can create an account.' : 'New user registration is disabled.'}</div>
					</div>
					<Button variant={registrationEnabled ? 'default' : 'destructive'} onClick={() => updateSetting('registration_enabled', registrationEnabled ? 'false' : 'true')}>
						{registrationEnabled ? 'Enabled' : 'Disabled'}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Uploads</CardTitle>
					<CardDescription>Control whether users can upload new videos.</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between">
					<div className="space-y-0.5">
						<div className="font-medium">Enable Uploads</div>
						<div className="text-sm text-muted-foreground">{uploadEnabled ? 'Users can upload videos.' : 'Video uploads are disabled globally.'}</div>
					</div>
					<Button variant={uploadEnabled ? 'default' : 'destructive'} onClick={() => updateSetting('upload_enabled', uploadEnabled ? 'false' : 'true')}>
						{uploadEnabled ? 'Enabled' : 'Disabled'}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};

export default Page;
