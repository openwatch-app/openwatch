'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Video } from '~app/types';
import { ShortsPlayer } from '~app/components/shorts/shorts-player';
import { Loader2, X } from 'lucide-react';
import { CommentSection } from '~app/components/comments/comment-section';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~components/sheet';
import { Button } from '~components/button';
import { cn } from '~lib/utils';
import { authClient } from '~lib/auth-client';

const ShortsFeedPage = () => {
	const params = useParams();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const initialVideoId = params.id as string;

	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);
	const [isMuted, setIsMuted] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);
	const [showComments, setShowComments] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const isFetchingRef = useRef(false);

	// Check if mobile
	useEffect(() => {
		const checkIsMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkIsMobile();
		window.addEventListener('resize', checkIsMobile);
		return () => window.removeEventListener('resize', checkIsMobile);
	}, []);

	// Initial load
	useEffect(() => {
		const loadInitial = async () => {
			try {
				// Fetch the requested video
				const videoRes = await axios.get(`/api/videos/${initialVideoId}`);
				const initialVideo = videoRes.data;

				// Fetch feed (recommendations)
				const feedRes = await axios.get(`/api/shorts?limit=5&exclude=${initialVideoId}`);

				setVideos([initialVideo, ...feedRes.data]);
			} catch (error) {
				console.error('Error loading shorts:', error);
			} finally {
				setLoading(false);
			}
		};

		if (initialVideoId) {
			loadInitial();
		}
	}, [initialVideoId]);

	// Infinite scroll loading
	const loadMore = useCallback(async () => {
		if (isFetchingRef.current) return;
		isFetchingRef.current = true;
		try {
			// Fetch more shorts
			const excludeIds = videos
				.slice(-20)
				.map((v) => v.id)
				.join(',');
			const feedRes = await axios.get(`/api/shorts?limit=5&exclude=${excludeIds}`);
			const newVideos = feedRes.data;

			if (newVideos.length > 0) {
				setVideos((prev) => {
					const existingIds = new Set(prev.map((v) => v.id));
					const uniqueNewVideos = newVideos.filter((v: Video) => !existingIds.has(v.id));
					if (uniqueNewVideos.length === 0) return prev;
					return [...prev, ...uniqueNewVideos];
				});
			}
		} catch (error) {
			console.error(error);
		} finally {
			isFetchingRef.current = false;
		}
	}, [videos]);

	// Scroll handling (Intersection Observer)
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const index = Number(entry.target.getAttribute('data-index'));
						setActiveIndex(index);

						// Update URL without reload
						const video = videos[index];
						if (video) {
							// Use replaceState to avoid cluttering history stack with every scroll
							window.history.replaceState(null, '', `/shorts/${video.id}`);
						}

						// Load more if near end
						if (index >= videos.length - 2) {
							loadMore();
						}
					}
				});
			},
			{
				threshold: 0.6 // 60% visible
			}
		);

		const elements = container.querySelectorAll('[data-index]');
		elements.forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	}, [videos, loadMore]);

	if (loading) {
		return (
			<div className="flex md:h-[calc(100vh-64px)] h-[calc(100dvh-120px)] items-center justify-center bg-black">
				<Loader2 className="h-8 w-8 animate-spin text-white" />
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100dvh-120px)] md:h-[calc(100vh-64px)] bg-black overflow-hidden relative justify-center w-full z-0">
			<div ref={containerRef} className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide w-full max-w-full">
				{videos.map((video, index) => (
					<div key={video.id} data-index={index} className="h-full w-full snap-start flex justify-center overflow-hidden">
						<ShortsPlayer
							video={video}
							isActive={index === activeIndex}
							shouldLoad={Math.abs(index - activeIndex) <= 1}
							isMuted={isMuted}
							toggleMute={() => setIsMuted(!isMuted)}
							onCommentClick={() => setShowComments((prev) => !prev)}
						/>
					</div>
				))}
			</div>

			{/* Desktop Comments Panel */}
			<div className={cn('hidden md:flex flex-col bg-[#0f0f0f] border-l border-white/10 z-40 transition-[width] duration-300 ease-in-out overflow-hidden', showComments ? 'w-[400px]' : 'w-0')}>
				<div className="w-[400px] h-full">
					{showComments && videos[activeIndex] && (
						<CommentSection
							videoId={videos[activeIndex].id}
							videoOwnerId={videos[activeIndex].channel.id}
							currentUserId={session?.user?.id}
							variant="shorts"
							onClose={() => setShowComments(false)}
						/>
					)}
				</div>
			</div>

			{/* Mobile Comments Sheet */}
			{isMobile && (
				<div className="md:hidden">
					<Sheet open={showComments} onOpenChange={setShowComments}>
						<SheetContent side="bottom" showCloseButton={false} className="h-[60vh] p-0 bg-background text-foreground border-t border-border z-60 rounded-t-xl flex flex-col mb-16">
							<SheetHeader className="sr-only">
								<SheetTitle>Comments</SheetTitle>
							</SheetHeader>
							{/* Drag Handle */}
							<div className="w-full flex justify-center pt-3 pb-1 shrink-0">
								<div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
							</div>
							{/* No header here needed as CommentSection (shorts variant) has it, but wait, mobile sheet usually needs its own header or use the variant? 
                            If I use variant="shorts" on mobile, it will have a close button and header.
                            The sheet also has a close button (hidden in my code but default exists).
                            Let's use variant="shorts" for mobile too for consistency, but maybe hide the close button since Sheet has one?
                            Actually, Sheet's close button is usually top-right.
                            My variant="shorts" header has close button.
                            Let's just use variant="shorts" and it will look like the design.
                        */}
							{videos[activeIndex] && (
								<div className="flex-1 overflow-y-auto min-h-0 bg-[#0f0f0f]">
									<CommentSection
										videoId={videos[activeIndex].id}
										videoOwnerId={videos[activeIndex].channel.id}
										currentUserId={session?.user?.id}
										variant="shorts"
										onClose={() => setShowComments(false)}
									/>
								</div>
							)}
						</SheetContent>
					</Sheet>
				</div>
			)}
		</div>
	);
};

export default ShortsFeedPage;
