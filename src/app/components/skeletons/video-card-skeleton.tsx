import { Skeleton } from '~components/skeleton';

export const VideoCardSkeleton = () => {
	return (
		<div className="flex flex-col gap-2">
			{/* Thumbnail Skeleton */}
			<Skeleton className="aspect-video w-full rounded-xl" />

			<div className="flex gap-2 mt-3">
				{/* Avatar Skeleton */}
				<Skeleton className="h-9 w-9 rounded-full shrink-0" />

				<div className="flex flex-col flex-1 gap-1">
					{/* Title Skeleton */}
					<Skeleton className="h-5 w-[90%]" />
					<Skeleton className="h-5 w-[70%]" />

					{/* Metadata Skeleton */}
					<div className="flex flex-col gap-1 mt-1">
						<Skeleton className="h-3 w-[50%]" />
						<Skeleton className="h-3 w-[40%]" />
					</div>
				</div>
			</div>
		</div>
	);
};
