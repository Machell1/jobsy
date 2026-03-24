"use client";

import { EngagementBadge } from "./EngagementBadge";

export function ProviderBadges({
  isHot,
  isNew,
  isFast,
}: {
  isHot?: boolean;
  isNew?: boolean;
  isFast?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {isHot && <EngagementBadge variant="hot" />}
      {isNew && <EngagementBadge variant="new" />}
      {isFast && <EngagementBadge variant="fast" />}
    </div>
  );
}
