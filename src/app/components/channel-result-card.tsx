import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import Link from 'next/link';
import { Channel } from '../types';
import { SubscribeButton } from './subscribe-button';
import { useState } from 'react';

interface ChannelResultCardProps {
	channel: Channel;
}

const ChannelResultCard = ({ channel: initialChannel }: ChannelResultCardProps) => {
	const [channel, setChannel] = useState(initialChannel);

	return (
		<div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 w-full py-6 border-b border-border/50 last:border-0">
			{/* Avatar */}
			<Link href={`/channel/${channel.isExternal ? channel.id : channel.handle || channel.id}`} className="shrink-0">
				<Avatar className="h-24 w-24 md:h-32 md:w-32">
					<AvatarImage src={channel.avatar} />
					<AvatarFallback className="text-4xl">{channel.name[0]}</AvatarFallback>
				</Avatar>
			</Link>

			{/* Info */}
			<div className="flex flex-col flex-1 items-center md:items-start text-center md:text-left gap-2 min-w-0">
				<Link href={`/channel/${channel.isExternal ? channel.id : channel.handle || channel.id}`}>
					<h3 className="font-medium text-lg md:text-xl">{channel.name}</h3>
				</Link>

				<div className="text-sm text-muted-foreground flex flex-wrap justify-center md:justify-start items-center gap-1">
					<span>{channel.handle}</span>
					{channel.isExternal && channel.host && (
						<>
							<span className="mx-1">•</span>
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">Source: {channel.host}</span>
						</>
					)}
					<span className="mx-1">•</span>
					<span>{channel.subscribers} subscribers</span>
				</div>

				<p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl mt-1">{channel.description || `Welcome to ${channel.name}'s channel.`}</p>
			</div>

			{/* Action */}
			<div className="shrink-0 mt-4 md:mt-0">
				{channel.isExternal ? (
					<Button disabled variant="secondary" className="rounded-full px-6 font-medium opacity-70 cursor-not-allowed">
						Subscribe
					</Button>
				) : (
					<SubscribeButton
						channelId={channel.id}
						initialIsSubscribed={channel.isSubscribed}
						initialNotify={channel.notify}
						buttonClassName="rounded-full px-6 font-medium"
						onSubscriptionChange={(subscribed) => {
							setChannel((prev) => {
								const currentCount = parseInt(prev.subscribers.replace(/,/g, '') || '0');
								const newCount = subscribed ? currentCount + 1 : Math.max(0, currentCount - 1);
								return {
									...prev,
									isSubscribed: subscribed,
									subscribers: newCount.toLocaleString()
								};
							});
						}}
					/>
				)}
			</div>
		</div>
	);
};

export default ChannelResultCard;
