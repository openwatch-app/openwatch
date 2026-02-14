'use client';

import { StudioCustomizationSkeleton } from '~components/skeletons/studio-customization-skeleton';
import { Loader2, HelpCircle, Camera } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Textarea } from '~components/textarea';
import { authClient } from '~lib/auth-client';
import { Button } from '~components/button';
import { useTranslation } from '~lib/i18n';
import { useRouter } from 'next/navigation';
import { Input } from '~components/input';
import axios from 'axios';

const CustomizationPage = () => {
	const { t } = useTranslation();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [isUpdating, setIsUpdating] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const avatarInputRef = useRef<HTMLInputElement>(null);
	const bannerInputRef = useRef<HTMLInputElement>(null);

	const [formData, setFormData] = useState({
		name: '',
		handle: '',
		description: '',
		avatar: '',
		banner: ''
	});

	const [initialData, setInitialData] = useState({
		name: '',
		handle: '',
		description: '',
		avatar: '',
		banner: ''
	});

	const [pendingDeletedFiles, setPendingDeletedFiles] = useState<string[]>([]);

	const activePreviews = useRef<{ [key: string]: string | null }>({
		avatar: null,
		banner: null
	});

	const [origin, setOrigin] = useState('');

	useEffect(() => {
		setOrigin(window.location?.origin || '');
	}, []);

	useEffect(() => {
		return () => {
			if (activePreviews.current.avatar) URL.revokeObjectURL(activePreviews.current.avatar);
			if (activePreviews.current.banner) URL.revokeObjectURL(activePreviews.current.banner);
		};
	}, []);

	useEffect(() => {
		if (sessionPending) return;
		if (!session) {
			router.push('/auth');
			return;
		}

		const fetchChannelData = async () => {
			try {
				const response = await axios.get(`/api/channel/${session.user.id}`);
				const data = {
					name: response.data.name || '',
					handle: response.data.handle || '',
					description: response.data.description || '',
					avatar: response.data.avatar || '',
					banner: response.data.banner || ''
				};
				setFormData(data);
				setInitialData(data);
			} catch (error) {
				console.error('Error fetching channel data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchChannelData();
	}, [session, sessionPending, router]);

	useEffect(() => {
		const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
		setHasChanges(changed);
	}, [formData, initialData]);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Revoke previous preview if it exists
		if (activePreviews.current[type]) {
			URL.revokeObjectURL(activePreviews.current[type]!);
		}

		// Create a preview URL immediately for better UX
		const previewUrl = URL.createObjectURL(file);
		activePreviews.current[type] = previewUrl;
		setFormData((prev) => ({ ...prev, [type]: previewUrl }));

		// We will upload the actual file when "Publish" is clicked, or right now?
		// User said "store it on server", so let's upload it now and get the path.
		const uploadFormData = new FormData();
		uploadFormData.append('file', file);
		uploadFormData.append('type', type === 'avatar' ? 'avatars' : 'banners');

		try {
			const response = await axios.post('/api/upload/image', uploadFormData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});
			setFormData((prev) => ({ ...prev, [type]: response.data.url }));

			// Revoke the preview URL as we now have the server URL
			if (activePreviews.current[type] === previewUrl) {
				URL.revokeObjectURL(previewUrl);
				activePreviews.current[type] = null;
			}
		} catch (error) {
			console.error('Error uploading file:', error);
			// Revert on error
			setFormData((prev) => ({ ...prev, [type]: initialData[type as keyof typeof initialData] }));

			// Clean up the preview URL since we are reverting
			if (activePreviews.current[type] === previewUrl) {
				URL.revokeObjectURL(previewUrl);
				activePreviews.current[type] = null;
			}
		}
	};

	const handleRemoveFile = (type: 'avatar' | 'banner') => {
		const url = formData[type];
		if (url && url.startsWith('/api/images/')) {
			setPendingDeletedFiles((prev) => [...prev, url]);
		}
		setFormData((prev) => ({ ...prev, [type]: '' }));
	};

	const handleUpdate = async () => {
		try {
			setIsUpdating(true);

			for (const url of pendingDeletedFiles) {
				try {
					await axios.post('/api/upload/delete', { url });
				} catch (error) {
					console.error('Error deleting file:', error);
				}
			}
			setPendingDeletedFiles([]);

			await axios.patch('/api/channel/update', {
				name: formData.name,
				handle: formData.handle,
				description: formData.description,
				image: formData.avatar,
				banner: formData.banner
			});
			setInitialData(formData);
			setHasChanges(false);
			setIsUpdating(false);
		} catch (err: any) {
			console.error('Error updating channel:', err);
			if (axios.isAxiosError(err) && err.response?.data?.error) {
				setErrorMessage(err.response.data.error);
			} else {
				setErrorMessage('An unexpected error occurred');
			}
			setIsUpdating(false);
		}
	};

	if (loading || sessionPending) {
		return <StudioCustomizationSkeleton />;
	}

	return (
		<div className="max-w-5xl mx-auto pb-20">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">{t('studio.channel_customization')}</h1>
				<div className="flex gap-2">
					<Button variant="ghost" className="rounded-full font-medium" onClick={() => router.push(`/channel/${formData.handle || session?.user.id}`)}>
						{t('studio.view_channel')}
					</Button>
					<Button
						variant="secondary"
						className="rounded-full font-medium"
						disabled={!hasChanges || isUpdating}
						onClick={() => {
							setFormData(initialData);
							setPendingDeletedFiles([]);
						}}
					>
						{t('common.cancel')}
					</Button>
					<Button className="rounded-full font-medium bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black px-6" disabled={!hasChanges || isUpdating} onClick={handleUpdate}>
						{isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						{t('studio.publish')}
					</Button>
				</div>
			</div>

			<div className="space-y-10">
				{/* Banner image */}
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="font-semibold text-base">{t('studio.banner_image')}</h3>
						<p className="text-sm text-muted-foreground">{t('studio.banner_description')}</p>
					</div>
					<div className="flex flex-col md:flex-row gap-6">
						<div className="w-full md:w-[426px] aspect-video bg-[#1f1f1f] rounded-lg overflow-hidden relative group">
							{formData.banner ? (
								<img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8">
									<div className="w-32 h-20 border-2 border-dashed border-muted-foreground/50 rounded flex items-center justify-center mb-4">
										<div className="w-16 h-10 bg-muted-foreground/20 rounded"></div>
									</div>
								</div>
							)}
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-12 w-12" onClick={() => bannerInputRef.current?.click()}>
									<Camera className="h-6 w-6" />
								</Button>
							</div>
						</div>
						<div className="flex-1 space-y-4 pt-2">
							<p className="text-xs text-muted-foreground max-w-sm">
								{t('studio.banner_hint')} <HelpCircle className="h-3 w-3 inline cursor-help" />
							</p>
							<input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
							<div className="flex gap-4">
								<Button variant="ghost" className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 p-0 h-auto font-medium" onClick={() => bannerInputRef.current?.click()}>
									{formData.banner ? t('studio.change') : t('studio.upload')}
								</Button>
								{formData.banner && (
									<Button variant="ghost" className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 p-0 h-auto font-medium" onClick={() => handleRemoveFile('banner')}>
										{t('common.remove')}
									</Button>
								)}
							</div>
						</div>
					</div>
				</section>

				{/* Picture */}
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="font-semibold text-base">{t('studio.picture')}</h3>
						<p className="text-sm text-muted-foreground">{t('studio.picture_description')}</p>
					</div>
					<div className="flex flex-col md:flex-row gap-6">
						<div className="w-[120px] h-[120px] bg-[#1f1f1f] rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-[#3f3f3f] relative group">
							{formData.avatar ? (
								<img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
							) : (
								<div className="text-4xl text-muted-foreground uppercase">{formData.name[0]}</div>
							)}
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Camera className="h-6 w-6 text-white" />
							</div>
							<button className="absolute inset-0 w-full h-full cursor-pointer opacity-0" onClick={() => avatarInputRef.current?.click()} />
						</div>
						<div className="flex-1 space-y-4 pt-2">
							<p className="text-xs text-muted-foreground max-w-sm">
								{t('studio.picture_hint')} <HelpCircle className="h-3 w-3 inline cursor-help" />
							</p>
							<input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
							<div className="flex gap-4">
								<Button variant="ghost" className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 p-0 h-auto font-medium" onClick={() => avatarInputRef.current?.click()}>
									{formData.avatar ? t('studio.change') : t('studio.upload')}
								</Button>
								{formData.avatar && (
									<Button variant="ghost" className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 p-0 h-auto font-medium" onClick={() => handleRemoveFile('avatar')}>
										{t('common.remove')}
									</Button>
								)}
							</div>
						</div>
					</div>
				</section>

				{/* Name */}
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="font-semibold text-base">{t('studio.name')}</h3>
						<p className="text-xs text-muted-foreground max-w-2xl">
							{t('studio.name_description')} <HelpCircle className="h-3 w-3 inline cursor-help" />
						</p>
					</div>
					<Input
						placeholder={t('studio.name')}
						className="max-w-2xl h-12 bg-[#0f0f0f] border-[#3f3f3f] text-base"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
					/>
				</section>

				{/* Handle */}
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="font-semibold text-base">{t('studio.handle')}</h3>
						<p className="text-xs text-muted-foreground max-w-2xl">{t('studio.handle_description')}</p>
					</div>
					<div className="space-y-2">
						<Input
							placeholder={t('studio.handle')}
							className={`max-w-2xl h-12 bg-[#0f0f0f] border-[#3f3f3f] text-base ${errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
							value={formData.handle}
							onChange={(e) => {
								setFormData({ ...formData, handle: e.target.value });
								if (errorMessage) setErrorMessage(null);
							}}
						/>
						{errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
						<p className="text-xs text-muted-foreground">
							{origin}/{formData.handle || t('studio.handlePlaceholder')}
						</p>
					</div>
				</section>

				{/* Description */}
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="font-semibold text-base">{t('studio.description')}</h3>
						<p className="text-xs text-muted-foreground max-w-2xl">{t('studio.description_hint')}</p>
					</div>
					<Textarea
						placeholder={t('studio.description')}
						className="max-w-2xl min-h-[160px] bg-[#0f0f0f] border-[#3f3f3f] text-base resize-none"
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
					/>
				</section>
			</div>
		</div>
	);
};

export default CustomizationPage;
