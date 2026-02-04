'use client';

import { useState } from 'react';
import axios from 'axios';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { Button } from '~components/button';
import { authClient } from '~lib/auth-client';
import { Smile } from 'lucide-react';

interface CommentInputProps {
	videoId: string;
	parentId?: string;
	onCommentAdded: (comment: any) => void;
	onCancel?: () => void;
	autoFocus?: boolean;
}

export const CommentInput = ({ videoId, parentId, onCommentAdded, onCancel, autoFocus }: CommentInputProps) => {
	const { data: session } = authClient.useSession();
	const [content, setContent] = useState('');
	const [loading, setLoading] = useState(false);
	const [isFocused, setIsFocused] = useState(false);

	const handleSubmit = async () => {
		if (!content.trim()) return;

		try {
			setLoading(true);
			const response = await axios.post(`/api/videos/${videoId}/comments`, { content, parentId });
			onCommentAdded(response.data);
			setContent('');
			setIsFocused(false);
			if (onCancel) onCancel();
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	if (!session) {
		return <div className="flex items-center gap-4 p-4 text-sm text-muted-foreground">Please sign in to comment.</div>;
	}

	return (
		<div className="flex gap-4 w-full mb-4">
			<Avatar className="h-10 w-10">
				<AvatarImage src={session.user.image || ''} />
				<AvatarFallback>{session.user.name[0]}</AvatarFallback>
			</Avatar>
			<div className="flex-1">
				<div className="relative">
					<input
						type="text"
						placeholder="Add a comment..."
						value={content}
						onChange={(e) => setContent(e.target.value)}
						onFocus={() => setIsFocused(true)}
						className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-white transition-colors pb-1"
						autoFocus={autoFocus}
					/>
				</div>
				{(isFocused || content || parentId) && (
					<div className="flex justify-between items-center mt-2">
						<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
							<Smile className="h-5 w-5" />
						</Button>
						<div className="flex gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setContent('');
									setIsFocused(false);
									if (onCancel) onCancel();
								}}
								disabled={loading}
								className="rounded-full"
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleSubmit}
								disabled={!content.trim() || loading}
								className="rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
							>
								{loading ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
