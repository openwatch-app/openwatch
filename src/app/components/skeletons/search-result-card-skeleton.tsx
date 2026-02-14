import { Skeleton } from '~components/skeleton';

export const SearchResultCardSkeleton = () => {
	return (
		<div className="flex flex-col md:flex-row gap-4 w-full">
			{/* Thumbnail Skeleton */}
			<Skeleton className="shrink-0 w-full md:w-[360px] aspect-video rounded-xl" />

			{/* Info Skeleton */}
			<div className="flex flex-col flex-1 gap-2 min-w-0 py-1">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-3 w-1/3" />
				<div className="flex items-center gap-2 my-1">
					<Skeleton className="h-6 w-6 rounded-full shrink-0" />
					<Skeleton className="h-3 w-24" />
				</div>
				<Skeleton className="h-3 w-full hidden md:block" />
				<Skeleton className="h-3 w-2/3 hidden md:block" />
			</div>
		</div>
	);
};
