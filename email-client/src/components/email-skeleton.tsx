import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface EmailSkeletonProps {
  count?: number
}

export function EmailSkeleton({ count = 5 }: EmailSkeletonProps) {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="mb-2 px-3 py-2 animate-pulse">
          <div className="flex items-start gap-2 w-full">
            {/* Avatar Skeleton */}
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            
            {/* Content Skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* From and Date */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              
              {/* Subject */}
              <Skeleton className="h-4 w-3/4" />
              
              {/* Body Preview */}
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            
            {/* Status Icon Skeleton */}
            <Skeleton className="h-4 w-4 flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  )
}
