'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~components/dropdown-menu';
import { Loader2, AlignLeft } from 'lucide-react';
import { CommentInput } from './comment-input';
import { CommentItem } from './comment-item';
import { useEffect, useState } from 'react';
import { useTranslation } from '~lib/i18n';
import { Comment } from '~app/types';
import axios from 'axios';

interface CommentSectionProps {
	videoId: string;
	videoOwnerId: string;
	currentUserId?: string;
	variant?: 'default' | 'shorts';
	onClose?: () => void;
}

export const CommentSection = ({ videoId, videoOwnerId, currentUserId, variant = 'default', onClose }: CommentSectionProps) => {
	const { t } = useTranslation();
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(true);
	const [sort, setSort] = useState<'top' | 'newest'>('top');

	const isVideoOwner = videoOwnerId === currentUserId;
	const countComments = (items: Comment[]): number => {
		return items.reduce((total, item) => {
			const repliesCount = item.replies ? countComments(item.replies) : 0;
			return total + 1 + repliesCount;
		}, 0);
	};

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

	if (variant === 'shorts') {
		return (
			<div className="flex flex-col h-full bg-[#0f0f0f] text-white">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
					<h3 className="text-xl font-bold">
						{t('comments.title')} {countComments(comments)}
					</h3>
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors">
									<AlignLeft className="h-5 w-5" />
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48 bg-[#282828] border-white/10 text-white z-50">
								<DropdownMenuItem onClick={() => setSort('top')} className="hover:bg-white/10 cursor-pointer">
									{t('comments.top_comments')}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setSort('newest')} className="hover:bg-white/10 cursor-pointer">
									{t('comments.newest_first')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						{onClose && (
							<div onClick={onClose} className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="w-6 h-6"
								>
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</div>
						)}
					</div>
				</div>

				{/* Scrollable List */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
					{comments.map((comment) => (
						<CommentItem key={comment.id} comment={comment} videoId={videoId} isVideoOwner={isVideoOwner} onDelete={handleDelete} onUpdate={handleUpdate} />
					))}
				</div>

				{/* Sticky Input */}
				<div className="p-4 border-t border-white/10 bg-[#0f0f0f] shrink-0">
					<CommentInput videoId={videoId} onCommentAdded={handleCommentAdded} />
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-6xl mt-6">
			<div className="flex items-center gap-8 mb-6">
				<h3 className="text-xl font-bold">
					{countComments(comments)} {t('comments.title')}
				</h3>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div className="flex items-center gap-2 font-semibold text-sm cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded">
							<AlignLeft className="h-5 w-5" />
							<span>{t('comments.sort_by')}</span>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => setSort('top')} className={sort === 'top' ? 'bg-secondary' : ''}>
							{t('comments.top_comments')}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setSort('newest')} className={sort === 'newest' ? 'bg-secondary' : ''}>
							{t('comments.newest_first')}
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
