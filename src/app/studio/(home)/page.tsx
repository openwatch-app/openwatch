'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~components/table';
import { Eye, MessageSquare, ThumbsUp, Loader2, Pencil } from 'lucide-react';
import { authClient } from '~lib/auth-client';
import { Button } from '~components/button';
import { useEffect, useState } from 'react';
import { Video } from '~app/types';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '~lib/i18n';

const Page = () => {
	const { t } = useTranslation();
	const { data: session, isPending: isSessionLoading } = authClient.useSession();
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchVideos = async () => {
			if (!session?.user?.id) return;
			try {
				setLoading(true);
				const response = await axios.get(`/api/channel/${session.user.id}/videos`);
				setVideos(response.data);
			} catch (error) {
				console.error('Failed to fetch videos', error);
			} finally {
				setLoading(false);
			}
		};

		if (session?.user?.id) {
			fetchVideos();
		} else if (!isSessionLoading && !session) {
			setLoading(false);
		}
	}, [session?.user?.id, isSessionLoading]);

	if (loading || isSessionLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<h1 className="text-2xl font-bold mb-6">{t('studio.channel_content')}</h1>

			<div className="border rounded-md">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[400px]">{t('studio.video')}</TableHead>
							<TableHead>{t('studio.visibility')}</TableHead>
							<TableHead>{t('studio.restrictions')}</TableHead>
							<TableHead>{t('studio.date')}</TableHead>
							<TableHead className="text-right">{t('studio.views')}</TableHead>
							<TableHead className="text-right">{t('studio.comments')}</TableHead>
							<TableHead className="text-right">{t('studio.likes_vs_dislikes')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{videos.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									{t('studio.no_videos_found')}
								</TableCell>
							</TableRow>
						) : (
							videos.map((video) => (
								<TableRow key={video.id} className="group hover:bg-secondary/20">
									<TableCell>
										<div className="flex gap-4 items-start">
											<div className="relative w-28 aspect-video bg-muted rounded overflow-hidden shrink-0">
												<img
													src={video.thumbnail || '/images/no-thumbnail.jpg'}
													alt={`Thumbnail for ${video.title}`}
													onError={(e) => {
														(e.target as HTMLImageElement).src = '/images/no-thumbnail.jpg';
													}}
													className="object-cover w-full h-full"
												/>{' '}
												<div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">{video.duration}</div>
											</div>
											<div className="flex flex-col gap-1">
												<div className="font-medium line-clamp-1">{video.title}</div>
												<div className="text-xs text-muted-foreground line-clamp-2">{video.description || t('studio.add_description')}</div>
												<div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<Link href={`/studio/video/${video.id}`}>
														<Button variant="ghost" size="icon" className="h-6 w-6" title={t('studio.details')}>
															<Pencil className="h-4 w-4" />
														</Button>
													</Link>
													<Link href={`/watch/${video.id}`} target="_blank">
														<Button variant="ghost" size="icon" className="h-6 w-6" title={t('studio.view_on_site')}>
															<Eye className="h-4 w-4" />
														</Button>
													</Link>
													<Button variant="ghost" size="icon" className="h-6 w-6">
														<MessageSquare className="h-4 w-4" />
													</Button>
													<Button variant="ghost" size="icon" className="h-6 w-6">
														<ThumbsUp className="h-4 w-4" />
													</Button>
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											{video.visibility === 'draft' ? <Eye className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-green-500" />}
											<span className="capitalize">{video.visibility || 'Public'}</span>
										</div>
									</TableCell>
									<TableCell>{video.restrictions || 'None'}</TableCell>
									<TableCell>
										<div className="flex flex-col text-xs">
											<span>{video.uploadedAt}</span>
											<span className="text-muted-foreground">Published</span>
										</div>
									</TableCell>
									<TableCell className="text-right">{video.views}</TableCell>
									<TableCell className="text-right">0</TableCell>
									<TableCell className="text-right">100%</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};

export default Page;
