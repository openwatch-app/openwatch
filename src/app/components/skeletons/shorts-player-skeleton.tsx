import { Skeleton } from '~components/skeleton';

export const ShortsPlayerSkeleton = () => {
	return (
		<div className="relative h-full w-full flex justify-center snap-start shrink-0 overflow-hidden bg-black">
			<div className="relative h-full aspect-9/16 max-w-full w-full">
				{/* Right Side Actions Skeleton */}
				<div className="absolute right-4 bottom-20 flex flex-col gap-4 items-center z-20">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="w-12 h-12 rounded-full bg-white/20" />
					))}
				</div>

				{/* Bottom Info Skeleton */}
				<div className="absolute bottom-4 left-4 right-16 flex flex-col gap-3 z-20">
					<div className="flex items-center gap-2">
						<Skeleton className="w-10 h-10 rounded-full bg-white/20" />
						<Skeleton className="w-24 h-4 bg-white/20" />
						<Skeleton className="w-20 h-8 rounded-full bg-white/20" />
					</div>
					<Skeleton className="w-3/4 h-4 bg-white/20" />
					<Skeleton className="w-1/2 h-4 bg-white/20" />
				</div>
			</div>
		</div>
	);
};
