'use client';

import { Upload, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { useState } from 'react';
import axios from 'axios';

interface UploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const UploadDialog = ({ open, onOpenChange }: UploadDialogProps) => {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState('');
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	if (!open) return null;

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];
			let maxSizeGB = parseFloat(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_GB || '2');
			if (isNaN(maxSizeGB)) maxSizeGB = 2;

			if (selectedFile.size > maxSizeGB * 1024 * 1024 * 1024) {
				setError(`File size exceeds ${maxSizeGB}GB limit`);
				setFile(null);
				e.target.value = '';
				return;
			}
			setError(null);
			setFile(selectedFile);
			setTitle(selectedFile.name.split('.')[0]);
			setProgress(0);
		}
	};

	const handleClose = () => {
		setFile(null);
		setTitle('');
		setProgress(0);
		setError(null);
		setUploading(false);
		onOpenChange(false);
	};

	const handleUpload = async () => {
		if (!file) return;

		try {
			setUploading(true);
			setProgress(0);
			const formData = new FormData();
			formData.append('file', file);
			formData.append('title', title);

			const res = await axios.post('/api/upload', formData, {
				onUploadProgress: (progressEvent) => {
					const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
					setProgress(percentCompleted);
				}
			});

			if (res.data.videoId) {
				handleClose();
				router.push(`/studio/video/${res.data.videoId}`);
			}
		} catch (error) {
			console.error(error);
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6 relative">
				<Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleClose}>
					<X className="w-4 h-4" />
				</Button>

				<h2 className="text-xl font-bold mb-4">Upload Video</h2>

				<div className="space-y-4">
					{error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-md">{error}</div>}
					<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
						<input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
						<div className="bg-muted p-3 rounded-full mb-3">
							<Upload className="w-6 h-6 text-muted-foreground" />
						</div>
						{file ? (
							<p className="font-medium">{file.name}</p>
						) : (
							<>
								<p className="font-medium mb-1">Click to upload video</p>
								<p className="text-sm text-muted-foreground">MP4, MOV, AVI up to {process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_GB || 2}GB</p>
							</>
						)}
					</div>

					{file && (
						<div className="space-y-4">
							{uploading && (
								<div className="space-y-1">
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Uploading...</span>
										<span>{progress}%</span>
									</div>
									<div className="h-2 bg-secondary rounded-full overflow-hidden">
										<div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
									</div>
								</div>
							)}
						</div>
					)}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={handleClose} disabled={uploading}>
							Cancel
						</Button>
						<Button disabled={!file || uploading || !!error} onClick={handleUpload}>
							{uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							{uploading ? 'Uploading...' : 'Upload'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
