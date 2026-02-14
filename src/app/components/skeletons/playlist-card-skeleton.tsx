import { Skeleton } from '~components/skeleton';

export const PlaylistCardSkeleton = () => {
	return (
		<div className="flex flex-col gap-2">
			{/* Thumbnail Skeleton */}
			<div className="relative aspect-video w-full rounded-xl overflow-hidden">
				<Skeleton className="h-full w-full" />
				{/* Right side overlay imitation */}
				<div className="absolute inset-y-0 right-0 w-1/3 bg-black/20" />
			</div>

			{/* Info Skeleton */}
			<div className="flex flex-col gap-1 mt-2">
				<Skeleton className="h-5 w-[80%]" />
				<div className="flex flex-col gap-1">
					<Skeleton className="h-3 w-[40%]" />
					<Skeleton className="h-3 w-[50%]" />
					<Skeleton className="h-3 w-[30%] mt-1" />
				</div>
			</div>
		</div>
	);
};
