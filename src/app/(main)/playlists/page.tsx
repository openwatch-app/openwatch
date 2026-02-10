'use client';

import { PlaylistCard } from '~app/components/playlists/playlist-card';
import { authClient } from '~lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '~lib/i18n';

const PlaylistsPage = () => {
	const { t } = useTranslation();
	const router = useRouter();
	const { data: session, isPending: isAuthPending } = authClient.useSession();
	const [playlists, setPlaylists] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!isAuthPending && !session) {
			router.push('/auth');
			return;
		}

		if (session) {
			fetchPlaylists();
		}
	}, [session, isAuthPending]);

	const fetchPlaylists = async () => {
		try {
			setLoading(true);
			const res = await axios.get('/api/playlists');
			setPlaylists(res.data);
		} catch (error) {
			console.error('Error fetching playlists:', error);
		} finally {
			setLoading(false);
		}
	};

	if (isAuthPending || loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full min-h-screen bg-background p-6 md:p-8 max-w-[1600px] mx-auto">
			<h1 className="text-2xl font-bold mb-6">{t('sidebar.playlists')}</h1>

			{/* Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				{playlists.length === 0 ? (
					<div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
						<p className="text-lg">{t('common.no_playlists_found')}</p>
					</div>
				) : (
					playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)
				)}
			</div>
		</div>
	);
};

export default PlaylistsPage;
