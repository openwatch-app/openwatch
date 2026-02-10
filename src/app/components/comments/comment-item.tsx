'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~components/dropdown-menu';
import { ThumbsUp, ThumbsDown, MoreVertical, Heart, Pin, ChevronDown, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { CommentInput } from './comment-input';
import { authClient } from '~lib/auth-client';
import { Button } from '~components/button';
import { Comment } from '~app/types';
import { useTranslation } from '~lib/i18n';
import { useAppStore } from '~lib/store';
import { useState } from 'react';
import { cn } from '~lib/utils';
import Link from 'next/link';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ro';

dayjs.extend(relativeTime);

interface CommentItemProps {
	comment: Comment;
	videoId: string;
	isVideoOwner: boolean;
	onDelete: (id: string) => void;
	onUpdate: (updatedComment: Comment) => void;
	isReply?: boolean;
}

export const CommentItem = ({ comment, videoId, isVideoOwner, onDelete, onUpdate, isReply = false }: CommentItemProps) => {
	const { t } = useTranslation();
	const { language } = useAppStore();
	const { data: session } = authClient.useSession();
	const [isReplying, setIsReplying] = useState(false);
	const [showReplies, setShowReplies] = useState(false);

	const safeFromNow = (input: string | Date) => {
		const ts = dayjs(input).locale(language);
		if (!ts.isValid()) return '';
		const now = dayjs().locale(language);
		const futureOffset = ts.diff(now);
		return ts.subtract(futureOffset > 0 ? futureOffset : 0, 'ms').fromNow();
	};

	const isAuthor = session?.user?.id === comment.user.id;

	const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
		const previousReaction = comment.userReaction;
		const previousLikes = comment.likes;
		const previousDislikes = comment.dislikes;

		let newLikes = comment.likes;
		let newDislikes = comment.dislikes;
		let newReaction = comment.userReaction === type ? null : type;

		if (previousReaction === type) {
			if (type === 'LIKE') newLikes--;
			if (type === 'DISLIKE') newDislikes--;
		} else {
			if (previousReaction === 'LIKE') newLikes--;
			if (previousReaction === 'DISLIKE') newDislikes--;
			if (type === 'LIKE') newLikes++;
			if (type === 'DISLIKE') newDislikes++;
		}

		const updatedComment = { ...comment, likes: newLikes, dislikes: newDislikes, userReaction: newReaction };
		onUpdate(updatedComment);

		try {
			await axios.post(`/api/comments/${comment.id}/reaction`, { type });
		} catch (error) {
			onUpdate({ ...comment, likes: previousLikes, dislikes: previousDislikes, userReaction: previousReaction });
		}
	};

	const handlePin = async () => {
		if (!isVideoOwner) return;
		const newPinned = !comment.isPinned;
		onUpdate({ ...comment, isPinned: newPinned });
		try {
			await axios.post(`/api/comments/${comment.id}/pin`);
		} catch (error) {
			onUpdate({ ...comment, isPinned: !newPinned });
		}
	};

	const handleHeart = async () => {
		if (!isVideoOwner) return;
		const newHearted = !comment.isHearted;
		onUpdate({ ...comment, isHearted: newHearted });
		try {
			await axios.post(`/api/comments/${comment.id}/heart`);
		} catch (error) {
			onUpdate({ ...comment, isHearted: !newHearted });
		}
	};

	const handleDelete = async () => {
		if (!confirm(t('comments.delete_confirm'))) return;
		try {
			await axios.delete(`/api/comments/${comment.id}`);
			onDelete(comment.id);
		} catch (error) {
			console.error('Failed to delete comment');
		}
	};

	const handleReplyAdded = (newReply: Comment) => {
		const updatedReplies = [newReply, ...(comment.replies || [])];
		onUpdate({ ...comment, replies: updatedReplies });
		setIsReplying(false);
		setShowReplies(true);
	};

	return (
		<div className="w-full">
			<div className="flex gap-4 group relative">
				{/* Avatar */}
				<Link href={`/channel/${comment.user.id}`} className="shrink-0 z-10">
					<Avatar className={cn('h-10 w-10', isReply && 'h-8 w-8')}>
						<AvatarImage src={comment.user.avatar} />
						<AvatarFallback>{comment.user.name[0]}</AvatarFallback>
					</Avatar>
				</Link>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<Link href={`/channel/${comment.user.id}`} className={cn('font-semibold text-sm hover:text-zinc-300 transition-colors', comment.isPinned && 'bg-secondary px-1 rounded')}>
							{comment.user.name}
						</Link>
						<span className="text-xs text-muted-foreground">{safeFromNow(comment.createdAt)}</span>
						{comment.isPinned && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Pin className="h-3 w-3" /> {t('comments.pinned_by')}
							</div>
						)}
					</div>

					<p className="text-sm mb-2 whitespace-pre-wrap wrap-break-word">{comment.content}</p>

					{/* Action Bar */}
					<div className="flex items-center gap-2">
						<div className="flex items-center">
							<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={() => handleReaction('LIKE')}>
								<ThumbsUp className={cn('h-4 w-4', comment.userReaction === 'LIKE' && 'fill-foreground')} />
							</Button>
							<span className="text-xs text-muted-foreground w-6">{comment.likes > 0 ? comment.likes : ''}</span>
						</div>
						<div className="flex items-center">
							<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={() => handleReaction('DISLIKE')}>
								<ThumbsDown className={cn('h-4 w-4', comment.userReaction === 'DISLIKE' && 'fill-foreground')} />
							</Button>
							<span className="text-xs text-muted-foreground w-2">{comment.dislikes > 0 ? comment.dislikes : ''}</span>
						</div>
						{comment.isHearted && (
							<div className="flex items-center gap-1 text-primary ml-2" title="Hearted by creator">
								<div className="relative">
									<Avatar className="h-5 w-5 border border-background">
										<AvatarImage src={comment.user.avatar} />
										<AvatarFallback>{comment.user.name[0]}</AvatarFallback>
									</Avatar>
									<Heart className="h-3 w-3 fill-primary text-primary absolute -bottom-1 -right-1" />
								</div>
							</div>
						)}

						<Button variant="ghost" size="sm" className="h-8 rounded-full text-xs hover:bg-secondary ml-2" onClick={() => setIsReplying(!isReplying)}>
							{t('comments.reply')}
						</Button>

						{(isAuthor || isVideoOwner) && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full transition-opacity ml-auto md:opacity-0 md:group-hover:opacity-100">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="z-100">
									{isVideoOwner && (
										<>
											<DropdownMenuItem onClick={handlePin}>
												<Pin className="mr-2 h-4 w-4" /> {comment.isPinned ? t('comments.unpin') : t('comments.pin')}
											</DropdownMenuItem>
											<DropdownMenuItem onClick={handleHeart}>
												<Heart className={cn('mr-2 h-4 w-4', comment.isHearted && 'fill-primary text-primary')} />
												{comment.isHearted ? t('comments.unheart') : t('comments.heart')}
											</DropdownMenuItem>
										</>
									)}
									<DropdownMenuItem onClick={handleDelete} className="text-primary focus:text-primary">
										<Trash2 className="mr-2 h-4 w-4" /> {t('comments.delete')}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>

					{/* Reply Input */}
					{isReplying && (
						<div className="mt-4">
							<CommentInput videoId={videoId} parentId={comment.id} onCommentAdded={handleReplyAdded} onCancel={() => setIsReplying(false)} autoFocus />
						</div>
					)}

					{/* Show/Hide Replies Toggle (Standard YouTube style) */}
					{comment.replies && comment.replies.length > 0 && !showReplies && (
						<Button
							variant="ghost"
							size="sm"
							className="text-blue-600 dark:text-blue-400 hover:text-blue-500 h-9 p-0 hover:bg-blue-400/10 px-3 rounded-full mt-2 font-medium"
							onClick={() => setShowReplies(true)}
						>
							<ChevronDown className="h-5 w-5 mr-2" />
							{t('comments.replies_count', { count: comment.replies.length })}
						</Button>
					)}
				</div>
			</div>

			{/* Nested Replies with Thread Line */}
			{comment.replies && comment.replies.length > 0 && showReplies && (
				<div className="flex">
					{/* Thread Line Column - aligned with Parent Avatar center */}
					<div className="w-10 flex-none flex justify-center">
						{/* The vertical line */}
						<div className="w-0.5 bg-zinc-700/50 h-full rounded-b-full"></div>
					</div>

					<div className="flex-1 pl-0 pt-2">
						{/* Hide Replies Button inside the thread */}
						<div className="mb-2 pl-4">{/* Optional: We can keep the toggle above or here. Keeping it above is cleaner for "Show". "Hide" can be here. */}</div>

						<div className="space-y-4">
							{comment.replies.map((reply) => (
								<div key={reply.id} className="relative pl-4">
									{/* The Connector Curve */}
									<div className="absolute -left-5 top-[-0.8rem] w-12 h-8 border-b-2 border-l-2 border-zinc-700/50 rounded-bl-2xl z-0"></div>

									<CommentItem
										comment={reply}
										videoId={videoId}
										isVideoOwner={isVideoOwner}
										onDelete={(replyId) => {
											const updatedReplies = comment.replies!.filter((r) => r.id !== replyId);
											onUpdate({ ...comment, replies: updatedReplies });
										}}
										onUpdate={(updatedReply) => {
											const updatedReplies = comment.replies!.map((r) => (r.id === updatedReply.id ? updatedReply : r));
											onUpdate({ ...comment, replies: updatedReplies });
										}}
										isReply
									/>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
