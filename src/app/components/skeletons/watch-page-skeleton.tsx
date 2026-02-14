import { Skeleton } from '~components/skeleton';

export const WatchPageSkeleton = () => {
	return (
		<div className="flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto w-full p-4 sm:p-6">
			{/* Main Content (Left) */}
			<div className="flex-1 min-w-0">
				{/* Player Skeleton */}
				<Skeleton className="aspect-video w-full rounded-xl" />

				{/* Title Skeleton */}
				<div className="mt-4 space-y-2">
					<Skeleton className="h-7 w-3/4" />
				</div>

				{/* Actions & Channel Info */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
					{/* Channel */}
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-full shrink-0" />
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-9 w-24 rounded-full ml-4" />
					</div>

					{/* Buttons */}
					<div className="flex items-center gap-2">
						<Skeleton className="h-9 w-32 rounded-full" />
						<Skeleton className="h-9 w-24 rounded-full" />
						<Skeleton className="h-9 w-9 rounded-full" />
					</div>
				</div>

				{/* Description */}
				<div className="mt-4">
					<Skeleton className="h-24 w-full rounded-xl" />
				</div>

				{/* Comments Skeleton */}
				<div className="mt-6 space-y-4 hidden lg:block">
					<div className="flex gap-4">
						<Skeleton className="h-10 w-10 rounded-full shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
					<div className="flex gap-4">
						<Skeleton className="h-10 w-10 rounded-full shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
				</div>
			</div>

			{/* Sidebar (Right) */}
			<div className="lg:w-[400px] shrink-0 space-y-4">
				{/* Categories */}
				<div className="flex gap-2 mb-4 overflow-hidden">
					<Skeleton className="h-8 w-16 rounded-lg" />
					<Skeleton className="h-8 w-16 rounded-lg" />
					<Skeleton className="h-8 w-16 rounded-lg" />
				</div>

				{/* Recommended Videos */}
				{Array.from({ length: 10 }).map((_, i) => (
					<div key={i} className="flex gap-2">
						<Skeleton className="w-40 aspect-video rounded-lg shrink-0" />
						<div className="flex flex-col gap-1 flex-1 min-w-0">
							<Skeleton className="h-4 w-[90%]" />
							<Skeleton className="h-3 w-[60%]" />
							<Skeleton className="h-3 w-[40%]" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
