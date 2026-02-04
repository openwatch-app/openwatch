'use client';

import { useState, useEffect } from 'react';
import { Bell, MoreVertical, Heart, X } from 'lucide-react';
import { Button } from '~components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~components/dropdown-menu';
import { ScrollArea } from '~components/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { cn } from '~lib/utils';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Notification {
	id: string;
	type: 'VIDEO_UPLOAD' | 'COMMENT_REPLY' | 'COMMENT_HEART';
	resourceId: string;
	isRead: boolean;
	createdAt: string;
	sender: {
		id: string;
		name: string;
		avatar: string;
	};
	video?: {
		title: string;
		thumbnail: string;
	};
	comment?: {
		id: string;
		content: string;
	};
}

export const NotificationCenter = () => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();

	const fetchNotifications = async () => {
		try {
			const res = await axios.get('/api/notifications');
			setNotifications(res.data);
			setUnreadCount(res.data.filter((n: Notification) => !n.isRead).length);
		} catch (error) {
			console.error('Failed to fetch notifications', error);
		}
	};

	useEffect(() => {
		fetchNotifications();
		// Poll every 15 seconds
		const interval = setInterval(fetchNotifications, 15000);
		return () => clearInterval(interval);
	}, []);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (open) {
			fetchNotifications();
		}
	};

	const handleNotificationClick = async (notification: Notification) => {
		try {
			if (!notification.isRead) {
				await axios.post(`/api/notifications/${notification.id}/read`);
				// Optimistic update
				setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
				setUnreadCount((prev) => Math.max(0, prev - 1));
			}

			const url = notification.comment?.id ? `/watch/${notification.resourceId}?commentId=${notification.comment.id}` : `/watch/${notification.resourceId}`;

			router.push(url);
			setIsOpen(false);
		} catch (error) {
			console.error('Error handling notification click', error);
		}
	};

	const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
		e.stopPropagation();
		try {
			// Optimistic update
			setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
			const notification = notifications.find((n) => n.id === notificationId);
			if (notification && !notification.isRead) {
				setUnreadCount((prev) => Math.max(0, prev - 1));
			}

			await axios.delete(`/api/notifications/${notificationId}`);
		} catch (error) {
			console.error('Failed to delete notification', error);
			// Re-fetch notifications if deletion fails
			fetchNotifications();
		}
	};

	const renderContent = (n: Notification) => {
		switch (n.type) {
			case 'VIDEO_UPLOAD':
				return (
					<>
						<span className="font-semibold">{n.sender.name}</span> uploaded: {n.video?.title}
					</>
				);
			case 'COMMENT_REPLY':
				return (
					<>
						<span className="font-semibold">{n.sender.name}</span> replied: &quot;{n.comment?.content || '...'}&quot;
					</>
				);
			case 'COMMENT_HEART':
				return (
					<>
						Your comment got a <Heart className="inline w-3 h-3 text-primary fill-current mx-0.5" /> from <span className="font-semibold">{n.sender.name}</span>
					</>
				);
			default:
				return null;
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative hidden sm:flex">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border border-background" />}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[480px] p-0 bg-popover border text-popover-foreground shadow-xl rounded-xl overflow-hidden">
				<div className="flex items-center justify-between px-4 py-3 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
					<span className="font-semibold">Notifications</span>
				</div>
				<ScrollArea className="h-[500px]">
					{notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
							<Bell className="h-12 w-12 mb-4 opacity-20" />
							<p className="text-sm">No notifications yet</p>
						</div>
					) : (
						<div className="py-0">
							{notifications.map((notification) => (
								<div key={notification.id} className="relative group">
									<DropdownMenuItem
										className={cn(
											'flex items-start gap-4 p-4 cursor-pointer focus:bg-accent/50 focus:text-accent-foreground rounded-none border-l-4 transition-all duration-200',
											!notification.isRead ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:bg-accent/50'
										)}
										onClick={() => handleNotificationClick(notification)}
									>
										{/* Unread Indicator (Dot) */}
										{!notification.isRead && <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />}

										{/* Avatar */}
										<Avatar className="h-10 w-10 shrink-0 border border-border/50">
											<AvatarImage src={notification.sender.avatar} />
											<AvatarFallback>{notification.sender.name[0]}</AvatarFallback>
										</Avatar>

										{/* Content */}
										<div className="flex-1 min-w-0 space-y-1.5">
											<p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">{renderContent(notification)}</p>
											<p className="text-xs text-muted-foreground font-medium">{dayjs(notification.createdAt).fromNow()}</p>
										</div>

										{/* Thumbnail */}
										{notification.video?.thumbnail && (
											<div className="w-20 h-11 shrink-0 rounded-md overflow-hidden bg-muted border border-border/50 shadow-sm group-hover:shadow-md transition-shadow">
												<img src={notification.video.thumbnail} alt="" className="object-cover w-full h-full" />
											</div>
										)}

										{/* Options / Delete */}
										<div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background hover:text-primary"
												onClick={(e) => handleDelete(e, notification.id)}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</DropdownMenuItem>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
