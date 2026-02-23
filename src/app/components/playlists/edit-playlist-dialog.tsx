'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Textarea } from '../textarea';
import { Button } from '../button';
import { Input } from '../input';
import { useTranslation } from '~lib/i18n';
import { EmojiPicker } from '~components/emoji-picker';
import axios from 'axios';

interface EditPlaylistDialogProps {
	playlist: {
		id: string;
		title: string;
		description: string | null;
		visibility: 'public' | 'private' | 'unlisted';
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (updatedPlaylist: any) => void;
}

export const EditPlaylistDialog = ({ playlist, open, onOpenChange, onUpdate }: EditPlaylistDialogProps) => {
	const { t } = useTranslation();
	const [title, setTitle] = useState(playlist.title);
	const [description, setDescription] = useState(playlist.description || '');
	const [visibility, setVisibility] = useState(playlist.visibility);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setTitle(playlist.title);
			setDescription(playlist.description || '');
			setVisibility(playlist.visibility);
			setError(null);
		}
	}, [open, playlist]);

	const handleSave = async () => {
		if (!title.trim()) return;

		try {
			setSaving(true);
			setError(null);
			const res = await axios.put(`/api/playlists/${playlist.id}`, {
				title,
				description,
				visibility
			});

			onUpdate(res.data);
			onOpenChange(false);
		} catch (error: any) {
			console.error('Error updating playlist:', error);
			const errorMessage = error.response?.data?.error || 'Failed to update playlist';
			setError(errorMessage);
		} finally {
			setSaving(false);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="bg-background border rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[90vh] relative animate-in fade-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-border/50">
					<h2 className="font-medium text-lg">{t('playlists.edit_dialog.title')}</h2>
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
						<X className="w-4 h-4" />
					</Button>
				</div>

				{/* Form */}
				<div className="p-6 space-y-4 overflow-y-auto">
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-sm font-medium text-foreground">{t('playlists.edit_dialog.playlist_title')}</label>
							<EmojiPicker onEmojiClick={(emoji) => setTitle((prev) => prev + emoji)} />
						</div>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('playlists.edit_dialog.playlist_title_placeholder')} maxLength={150} />
					</div>

					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-sm font-medium text-foreground">{t('playlists.edit_dialog.description')}</label>
							<EmojiPicker onEmojiClick={(emoji) => setDescription((prev) => prev + emoji)} />
						</div>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={t('playlists.edit_dialog.description_placeholder')}
							className="resize-none min-h-[100px]"
							maxLength={5000}
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">{t('playlists.edit_dialog.visibility')}</label>
						<select
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							value={visibility}
							onChange={(e) => setVisibility(e.target.value as any)}
						>
							<option value="public">{t('common.visibility.public')}</option>
							<option value="unlisted">{t('common.visibility.unlisted')}</option>
							<option value="private">{t('common.visibility.private')}</option>
						</select>
					</div>

					{error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">{error}</div>}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 p-4 border-t border-border/50 bg-secondary/10 rounded-b-xl">
					<Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
						{t('common.cancel')}
					</Button>
					<Button onClick={handleSave} disabled={!title.trim() || saving}>
						{saving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t('playlists.edit_dialog.saving')}
							</>
						) : (
							t('playlists.edit_dialog.save')
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};
