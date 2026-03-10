import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getListingFeed, Listing } from "@/api/listings";
import { recordSwipe, SwipeCreate } from "@/api/swipes";
import { api } from "@/api/client";
import { queueSwipe, flushQueue } from "@/utils/offlineQueue";

export function useSwipeDeck() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipedIds = useRef(new Set<string>());

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ["listing-feed"],
    queryFn: () => getListingFeed(50),
  });

  // Flush any queued offline swipes when the feed loads
  useEffect(() => {
    if (listings.length > 0) {
      flushQueue(api).catch(() => {});
    }
  }, [listings.length]);

  const visibleListings = listings.filter((l) => !swipedIds.current.has(l.id));

  const handleSwipe = useCallback(
    async (listing: Listing, direction: "left" | "right") => {
      swipedIds.current.add(listing.id);
      setCurrentIndex((i) => i + 1);

      const swipeData: SwipeCreate = {
        target_id: listing.id,
        target_type: "listing",
        direction,
      };

      try {
        await recordSwipe(swipeData);
        if (direction === "right") {
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        }
      } catch {
        // Network error -- queue for later
        await queueSwipe({
          target_id: listing.id,
          target_type: "listing",
          direction,
        }).catch(() => {});
      }

      // Refetch when running low on cards
      if (visibleListings.length <= 3) {
        refetch();
      }
    },
    [visibleListings.length, queryClient, refetch]
  );

  return {
    listings: visibleListings,
    currentIndex,
    isLoading,
    handleSwipe,
    refetch,
  };
}
