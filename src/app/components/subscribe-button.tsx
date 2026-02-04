'use client';

import { Loader2, Bell, BellRing } from 'lucide-react';
import { authClient } from '~lib/auth-client';
import { Button } from '~components/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '~lib/utils';
import axios from 'axios';

interface SubscribeButtonProps {
	channelId: string;
	initialIsSubscribed?: boolean;
	initialNotify?: boolean;
	isOwner?: boolean;
	className?: string;
	onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export const SubscribeButton = ({ channelId, initialIsSubscribed = false, initialNotify = false, isOwner = false, className, onSubscriptionChange }: SubscribeButtonProps) => {
	const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
	const [notify, setNotify] = useState(initialNotify);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const { data: session } = authClient.useSession();

	useEffect(() => {
		setIsSubscribed(initialIsSubscribed);
		setNotify(initialNotify);
	}, [initialIsSubscribed, initialNotify]);

	const handleSubscribe = async (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (!session) {
			router.push('/auth');
			return;
		}

		if (isOwner) return;

		try {
			setIsLoading(true);
			const response = await axios.post('/api/channel/subscribe', { channelId });
			const { subscribed } = response.data;

			setIsSubscribed(subscribed);

			if (!subscribed) {
				setNotify(false);
			}

			if (onSubscriptionChange) {
				onSubscriptionChange(subscribed);
			}
		} catch (err) {
			console.error('Error toggling subscription:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleNotifyToggle = async (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (!isSubscribed) return;

		const prevNotify = notify;
		try {
			const newNotify = !notify;
			setNotify(newNotify);
			await axios.post('/api/channel/notify', { channelId });
		} catch (error) {
			console.error('Error toggling notification:', error);
			setNotify(prevNotify); // Revert
		}
	};

	if (isOwner) return null;

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Button
				className={cn(
					'rounded-full font-medium transition-colors',
					isSubscribed ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-foreground text-background hover:bg-foreground/90'
				)}
				onClick={handleSubscribe}
				disabled={isLoading}
			>
				{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
				{isSubscribed ? 'Subscribed' : 'Subscribe'}
			</Button>

			{isSubscribed && (
				<Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleNotifyToggle} title={notify ? 'Turn off notifications' : 'Turn on notifications'}>
					{notify ? <BellRing className="h-5 w-5 fill-current" /> : <Bell className="h-5 w-5" />}
				</Button>
			)}
		</div>
	);
};
