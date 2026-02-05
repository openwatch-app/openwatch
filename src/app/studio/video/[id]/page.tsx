'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '~components/button';
import { Input } from '~components/input';
import { Textarea } from '~components/textarea';
import { Label } from '~components/label';
import { VideoPlayer } from '~components/video-player/video-player';
import { Loader2, ArrowLeft, ExternalLink, Copy, Check, ChevronDown, MoreVertical, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '~lib/utils';
import { Video } from '~app/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~components/dropdown-menu';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
	const [video, setVideo] = useState<Video | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [videoId, setVideoId] = useState<string>('');

	// Delete state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Form state
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [visibility, setVisibility] = useState('public');

	// Copy state
	const [copied, setCopied] = useState(false);

	const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	useEffect(() => {
		const init = async () => {
			const { id } = await params;
			setVideoId(id);
			fetchVideo(id);
		};
		init();
	}, [params]);

	// Poll for status updates when processing
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (video?.status === 'processing' && videoId) {
			interval = setInterval(async () => {
				try {
					const response = await axios.get(`/api/videos/${videoId}`);
					const data = response.data;
					// Only update the video object to reflect status changes
					// Do NOT update form fields (title, description) to avoid overwriting user input
					setVideo((prev) => (prev ? { ...prev, status: data.status, thumbnail: data.thumbnail } : data));
				} catch (error) {
					console.error('Failed to poll video status', error);
				}
			}, 5000);
		}
		return () => clearInterval(interval);
	}, [video?.status, videoId]);

	const fetchVideo = async (id: string) => {
		try {
			setLoading(true);
			const response = await axios.get(`/api/videos/${id}`);
			const data = response.data;
			setVideo(data);
			setTitle(data.title);
			setDescription(data.description || '');
			setVisibility(data.visibility || 'public');
		} catch (error) {
			console.error('Failed to fetch video', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!videoId) return;
		try {
			setSaving(true);
			await axios.patch(`/api/videos/${videoId}`, {
				title,
				description,
				visibility
			});
			// Ideally show a toast here
			console.log('Saved successfully');
		} catch (error) {
			console.error('Failed to save video', error);
		} finally {
			setSaving(false);
		}
	};

	const handleThumbnailClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !videoId) return;

		try {
			setUploadingThumbnail(true);
			const formData = new FormData();
			formData.append('file', file);

			const response = await axios.post(`/api/videos/${videoId}/thumbnail`, formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			if (response.data.thumbnailUrl) {
				setVideo((prev) => (prev ? { ...prev, thumbnail: response.data.thumbnailUrl } : null));
			}
		} catch (error) {
			console.error('Failed to upload thumbnail', error);
		} finally {
			setUploadingThumbnail(false);
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDelete = async () => {
		try {
			setDeleting(true);
			await axios.delete(`/api/videos/${videoId}`);
			router.push('/studio');
		} catch (error) {
			console.error('Failed to delete video', error);
		} finally {
			setDeleting(false);
		}
	};

	const copyLink = () => {
		if (!video) return;
		const link = `${window.location.origin}/watch/${video.id}`;
		navigator.clipboard.writeText(link);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!video) {
		return (
			<div className="flex flex-col h-full items-center justify-center gap-4">
				<p className="text-lg text-muted-foreground">Video not found</p>
				<Button variant="outline" onClick={() => router.push('/studio')}>
					Go back
				</Button>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6 sticky top-0 bg-background z-10 py-4 border-b">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={() => router.push('/studio')}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-xl font-bold">Video details</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" disabled={saving} onClick={() => fetchVideo(videoId)}>
						Undo changes
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive cursor-pointer">
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Delete Dialog */}
			{deleteDialogOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6">
						<h2 className="text-xl font-bold mb-2">Delete video</h2>
						<p className="text-muted-foreground mb-6">Are you sure you want to delete this video? This action cannot be undone.</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
								{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Delete forever
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
				{/* Left Column - Details */}
				<div className="lg:col-span-2 space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="title">Title (required)</Label>
							<Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title that describes your video" />
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell viewers about your video" className="h-32 resize-none" />
						</div>
					</div>

					{/* Thumbnail Section */}
					<div className="space-y-2">
						<Label>Thumbnail</Label>
						<p className="text-xs text-muted-foreground mb-2">Set a thumbnail that stands out and draws viewers' attention.</p>
						<div className="flex flex-col gap-4">
							<input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
							<div className="w-40 aspect-video border-2 border-primary rounded-lg overflow-hidden relative cursor-pointer group" onClick={handleThumbnailClick}>
								<img
									src={video.thumbnail || '/images/no-thumbnail.jpg'}
									onError={(e) => {
										(e.target as HTMLImageElement).src = '/images/no-thumbnail.jpg';
									}}
									alt="Current thumbnail"
									className="w-full h-full object-cover"
								/>
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
									<span className="text-white text-xs font-medium">{uploadingThumbnail ? 'Uploading...' : 'Change'}</span>
								</div>
								{uploadingThumbnail && (
									<div className="absolute inset-0 bg-black/60 flex items-center justify-center">
										<Loader2 className="h-6 w-6 animate-spin text-white" />
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Right Column - Preview & Settings */}
				<div className="space-y-6">
					{/* Status Card */}
					{video.status === 'processing' && (
						<div className="bg-blue-50/10 border border-blue-500/20 rounded-lg p-4 animate-pulse">
							<div className="flex items-center gap-3">
								<Loader2 className="h-5 w-5 animate-spin text-blue-500" />
								<div>
									<h3 className="font-medium text-blue-500">Processing video...</h3>
									<p className="text-xs text-muted-foreground">We are preparing your video in different qualities. You can edit details while you wait.</p>
								</div>
							</div>
						</div>
					)}

					{video.status === 'failed' && (
						<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
							<div className="flex items-center gap-3">
								<AlertCircle className="h-5 w-5 text-destructive" />
								<div>
									<h3 className="font-medium text-destructive">Processing failed</h3>
									<p className="text-xs text-muted-foreground">Something went wrong while processing your video. Please try uploading again.</p>
								</div>
							</div>
						</div>
					)}

					{/* Video Preview */}
					<div className="bg-card border rounded-lg overflow-hidden">
						<div className="aspect-video bg-black relative">
							<VideoPlayer videoId={video.id} />
						</div>
						<div className="p-4 space-y-4">
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">Video link</div>
								<div className="flex items-center gap-2">
									<Link href={`/watch/${video.id}`} target="_blank" className="text-sm text-blue-500 hover:underline truncate block flex-1">
										{typeof window !== 'undefined' ? `${window.location.origin}/watch/${video.id}` : `/watch/${video.id}`}
									</Link>
									<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyLink}>
										{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
									</Button>
								</div>
							</div>

							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">Filename</div>
								<div className="text-sm truncate">{(video as any).originalPath?.split(/[\\/]/).pop() || 'video.mp4'}</div>
							</div>

							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">Video quality</div>
								<div className="flex gap-1">
									<span className="bg-primary/10 text-primary text-[10px] px-1 rounded">SD</span>
									<span className="bg-primary/10 text-primary text-[10px] px-1 rounded">HD</span>
								</div>
							</div>
						</div>
					</div>

					{/* Visibility */}
					<div className="space-y-2">
						<Label>Visibility</Label>
						<div className="relative">
							<select
								className="w-full h-10 px-3 py-2 bg-transparent border rounded-md appearance-none cursor-pointer"
								value={visibility}
								onChange={(e) => setVisibility(e.target.value)}
							>
								<option value="public" className="bg-background">
									Public
								</option>
								<option value="private" className="bg-background">
									Private
								</option>
								<option value="unlisted" className="bg-background">
									Unlisted
								</option>
							</select>
							<ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
