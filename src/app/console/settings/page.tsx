'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~components/card';
import { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '~lib/i18n';

const Page = () => {
	const { t } = useTranslation();
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
				<h1 className="text-3xl font-bold tracking-tight">{t('console.settings.title')}</h1>
				<p className="text-muted-foreground">{t('console.settings.description')}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t('console.settings.registration.title')}</CardTitle>
					<CardDescription>{t('console.settings.registration.description')}</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between">
					<div className="space-y-0.5">
						<div className="font-medium">{t('console.settings.registration.label')}</div>
						<div className="text-sm text-muted-foreground">
							{registrationEnabled ? t('console.settings.registration.enabled_desc') : t('console.settings.registration.disabled_desc')}
						</div>
					</div>
					<Button variant={registrationEnabled ? 'default' : 'destructive'} onClick={() => updateSetting('registration_enabled', registrationEnabled ? 'false' : 'true')}>
						{registrationEnabled ? t('console.settings.status.enabled') : t('console.settings.status.disabled')}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t('console.settings.uploads.title')}</CardTitle>
					<CardDescription>{t('console.settings.uploads.description')}</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between">
					<div className="space-y-0.5">
						<div className="font-medium">{t('console.settings.uploads.label')}</div>
						<div className="text-sm text-muted-foreground">
							{uploadEnabled ? t('console.settings.uploads.enabled_desc') : t('console.settings.uploads.disabled_desc')}
						</div>
					</div>
					<Button variant={uploadEnabled ? 'default' : 'destructive'} onClick={() => updateSetting('upload_enabled', uploadEnabled ? 'false' : 'true')}>
						{uploadEnabled ? t('console.settings.status.enabled') : t('console.settings.status.disabled')}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};

export default Page;
