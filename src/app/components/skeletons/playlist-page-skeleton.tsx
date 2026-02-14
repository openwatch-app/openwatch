import { Skeleton } from '~components/skeleton';

export const PlaylistPageSkeleton = () => {
	return (
		<div className="flex flex-col lg:flex-row max-w-[1284px] mx-auto w-full p-4 sm:p-6 gap-6">
			{/* Left Sidebar Skeleton */}
			<div className="lg:w-[360px] shrink-0">
				<div className="lg:sticky lg:top-24 flex flex-col gap-4 bg-secondary/30 rounded-2xl p-6 border border-border/50">
					{/* Cover Image */}
					<Skeleton className="aspect-video w-full rounded-xl" />

					{/* Title & Info */}
					<div className="space-y-2">
						<Skeleton className="h-8 w-3/4" />
						<div className="flex flex-col gap-2">
							<Skeleton className="h-5 w-1/2" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<Skeleton className="h-10 flex-1 rounded-full" />
						<Skeleton className="h-10 flex-1 rounded-full" />
					</div>

					{/* Additional Actions */}
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-10 w-10 rounded-full" />
					</div>

					{/* Description */}
					<div className="space-y-1 mt-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</div>
			</div>

			{/* Right Content (Videos) Skeleton */}
			<div className="flex-1 min-w-0">
				<div className="space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="flex gap-3 p-2">
							<Skeleton className="h-4 w-4 my-auto shrink-0" /> {/* Index */}
							<Skeleton className="w-40 aspect-video rounded-lg shrink-0" /> {/* Thumbnail */}
							<div className="flex-1 flex flex-col gap-2 py-1">
								<Skeleton className="h-5 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
