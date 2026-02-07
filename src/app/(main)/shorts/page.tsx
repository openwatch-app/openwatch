'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const ShortsPage = () => {
	const router = useRouter();
    const [noShorts, setNoShorts] = useState(false);

	useEffect(() => {
		const fetchFirstShort = async () => {
			try {
				const res = await axios.get('/api/shorts?limit=1');
				if (res.data && res.data.length > 0) {
					router.replace(`/shorts/${res.data[0].id}`);
				} else {
                    setNoShorts(true);
				}
			} catch (error) {
				console.error(error);
                setNoShorts(true);
			}
		};

		fetchFirstShort();
	}, [router]);

    if (noShorts) {
        return (
            <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
                <p className="text-xl font-semibold">No Shorts available</p>
                <p className="text-muted-foreground">Upload a vertical video to get started!</p>
            </div>
        );
    }

	return (
		<div className="flex h-[calc(100vh-64px)] items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	);
};

export default ShortsPage;
