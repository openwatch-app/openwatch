'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Comment } from '~app/types';
import { CommentItem } from './comment-item';
import { CommentInput } from './comment-input';
import { Loader2, AlignLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~components/dropdown-menu';

interface CommentSectionProps {
	videoId: string;
	videoOwnerId: string;
	currentUserId?: string;
}

export const CommentSection = ({ videoId, videoOwnerId, currentUserId }: CommentSectionProps) => {
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(true);
	const [sort, setSort] = useState<'top' | 'newest'>('top');

	const isVideoOwner = videoOwnerId === currentUserId;

	useEffect(() => {
		const fetchComments = async () => {
			try {
				const res = await axios.get(`/api/videos/${videoId}/comments?sort=${sort}`);
				setComments(res.data);
			} catch (error) {
				console.error('Failed to fetch comments', error);
			} finally {
				setLoading(false);
			}
		};

		if (videoId) {
			fetchComments();
		}
	}, [videoId, sort]);

	const handleCommentAdded = (newComment: Comment) => {
		setComments((prev) => [newComment, ...prev]);
	};

	const handleDelete = (id: string) => {
		setComments((prev) => prev.filter((c) => c.id !== id));
	};

	const handleUpdate = (updatedComment: Comment) => {
		setComments((prev) => prev.map((c) => (c.id === updatedComment.id ? updatedComment : c)));
	};

	if (loading) {
		return <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />;
	}

	return (
		<div className="w-full max-w-6xl mt-6">
			<div className="flex items-center gap-8 mb-6">
				<h3 className="text-xl font-bold">{comments.length} Comments</h3>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div className="flex items-center gap-2 font-semibold text-sm cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded">
							<AlignLeft className="h-5 w-5" />
							<span>Sort by</span>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => setSort('top')} className={sort === 'top' ? 'bg-secondary' : ''}>
							Top comments
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setSort('newest')} className={sort === 'newest' ? 'bg-secondary' : ''}>
							Newest first
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="mb-8">
				<CommentInput videoId={videoId} onCommentAdded={handleCommentAdded} />
			</div>

			<div className="space-y-4">
				{comments.map((comment) => (
					<CommentItem key={comment.id} comment={comment} videoId={videoId} isVideoOwner={isVideoOwner} onDelete={handleDelete} onUpdate={handleUpdate} />
				))}
			</div>
		</div>
	);
};
