'use client';

import { X, Plus, Lock, Globe, EyeOff, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { useState, useEffect } from 'react';
import { Button } from '../button';
import { Input } from '../input';
import axios from 'axios';

interface Playlist {
	id: string;
	title: string;
	visibility: 'public' | 'private' | 'unlisted';
	hasVideo: boolean;
}

interface SaveToPlaylistProps {
	videoId: string;
	children: React.ReactNode;
}

export function SaveToPlaylist({ videoId, children }: SaveToPlaylistProps) {
	const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
	const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [creating, setCreating] = useState(false);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (open) {
			fetchPlaylists();
			setShowCreateForm(false);
		}
	}, [open, videoId]);

	const fetchPlaylists = async () => {
		try {
			setLoading(true);
			const res = await axios.get(`/api/playlists?containsVideoId=${videoId}`);
			setPlaylists(res.data);
		} catch (error) {
			console.error('Error fetching playlists:', error);
		} finally {
			setLoading(false);
		}
	};

	const togglePlaylist = async (playlistId: string, currentHasVideo: boolean) => {
		// Optimistic update
		setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, hasVideo: !currentHasVideo } : p)));

		try {
			if (currentHasVideo) {
				// Remove
				await axios.delete(`/api/playlists/${playlistId}/videos?videoId=${videoId}`);
			} else {
				// Add
				await axios.post(`/api/playlists/${playlistId}/videos`, { videoId });
			}
		} catch (error: any) {
			// Revert on error
			console.error('Error toggling playlist:', error);
			const errorMessage = error.response?.data?.error || 'Failed to update playlist';
			alert(errorMessage); // Show error to user
			setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, hasVideo: currentHasVideo } : p)));
		}
	};

	const handleCreatePlaylist = async () => {
		if (!newPlaylistTitle.trim()) return;

		try {
			setCreating(true);
			const res = await axios.post('/api/playlists', {
				title: newPlaylistTitle,
				visibility: newPlaylistVisibility
			});

			const newPlaylist = res.data;

			// Add video to new playlist immediately
			await axios.post(`/api/playlists/${newPlaylist.id}/videos`, { videoId });

			// Add to list and mark as checked
			setPlaylists((prev) => [{ ...newPlaylist, hasVideo: true }, ...prev]);

			setShowCreateForm(false);
			setNewPlaylistTitle('');
			setNewPlaylistVisibility('public');
		} catch (error: any) {
			console.error('Error creating playlist:', error);
			const errorMessage = error.response?.data?.error || 'Failed to create playlist';
			alert(errorMessage);
		} finally {
			setCreating(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-0 overflow-hidden bg-background border-border/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-3 border-b border-border/50 bg-secondary/10">
					<h2 className="font-semibold text-sm">Save to...</h2>
					<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-secondary/80" onClick={() => setOpen(false)}>
						<X className="w-3.5 h-3.5" />
					</Button>
				</div>

				{/* List */}
				<div className="overflow-y-auto p-1.5 max-h-[300px] custom-scrollbar">
					{loading ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="h-5 w-5 animate-spin text-primary/60" />
						</div>
					) : (
						<div className="space-y-0.5">
							{playlists.length === 0 && !loading && <div className="text-center py-6 text-xs text-muted-foreground italic">No playlists found</div>}
							{playlists.map((playlist) => (
								<label key={playlist.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/60 cursor-pointer transition-all active:scale-[0.98] group">
									<div className="relative flex items-center justify-center">
										<input
											type="checkbox"
											className="peer appearance-none w-4 h-4 border border-muted-foreground/50 rounded-sm checked:bg-primary checked:border-primary transition-all duration-200"
											checked={playlist.hasVideo}
											onChange={() => togglePlaylist(playlist.id, playlist.hasVideo)}
										/>
										<Check className="w-3 h-3 text-primary-foreground absolute pointer-events-none scale-0 peer-checked:scale-100 transition-transform duration-200" />
									</div>
									<span className="flex-1 text-xs font-medium truncate group-hover:text-primary transition-colors">{playlist.title}</span>
									<div className="opacity-40 group-hover:opacity-100 transition-opacity">
										{playlist.visibility === 'private' && <Lock className="w-3 h-3" />}
										{playlist.visibility === 'unlisted' && <EyeOff className="w-3 h-3" />}
										{playlist.visibility === 'public' && <Globe className="w-3 h-3" />}
									</div>
								</label>
							))}
						</div>
					)}
				</div>

				{/* Create New Form */}
				{!showCreateForm ? (
					<div className="p-2 border-t border-border/50 bg-secondary/5">
						<Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs rounded-md hover:bg-secondary/80 transition-all" onClick={() => setShowCreateForm(true)}>
							<Plus className="w-4 h-4 text-primary" />
							<span>Create new playlist</span>
						</Button>
					</div>
				) : (
					<div className="p-3 border-t border-border/50 bg-secondary/10 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
						<div className="space-y-2.5">
							<div>
								<label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-1 block px-1">Playlist Name</label>
								<Input
									value={newPlaylistTitle}
									onChange={(e) => setNewPlaylistTitle(e.target.value)}
									placeholder="e.g. My Favorites"
									className="h-8 text-xs bg-background border-border/50 focus:ring-1 focus:ring-primary/30"
									maxLength={150}
									autoFocus
								/>
							</div>

							<div>
								<label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-1 block px-1">Visibility</label>
								<select
									className="flex h-8 w-full rounded-md border border-border/50 bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
									value={newPlaylistVisibility}
									onChange={(e) => setNewPlaylistVisibility(e.target.value as any)}
								>
									<option value="public">Public</option>
									<option value="unlisted">Unlisted</option>
									<option value="private">Private</option>
								</select>
							</div>

							<div className="flex justify-end gap-1.5 pt-1">
								<Button variant="ghost" className="h-7 px-3 text-[11px]" onClick={() => setShowCreateForm(false)}>
									Cancel
								</Button>
								<Button className="h-7 px-3 text-[11px] shadow-sm" disabled={!newPlaylistTitle.trim() || creating} onClick={handleCreatePlaylist}>
									{creating ? 'Creating...' : 'Create'}
								</Button>
							</div>
						</div>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
