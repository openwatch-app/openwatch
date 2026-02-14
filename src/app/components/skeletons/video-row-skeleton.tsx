import { Skeleton } from '~components/skeleton';

export const VideoRowSkeleton = () => {
	return (
		<div className="flex gap-4 p-2">
			{/* Thumbnail Skeleton */}
			<Skeleton className="w-40 sm:w-60 aspect-video rounded-xl shrink-0" />

			{/* Info Skeleton */}
			<div className="flex-1 min-w-0 flex flex-col justify-start pt-1 gap-2">
				<Skeleton className="h-6 w-[80%]" />
				<div className="flex gap-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-20" />
				</div>
				<Skeleton className="h-4 w-[90%] hidden sm:block mt-2" />
			</div>
		</div>
	);
};
