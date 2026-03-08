import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getListingFeed, Listing } from "@/api/listings";
import { recordSwipe, SwipeCreate } from "@/api/swipes";

export function useSwipeDeck() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipedIds = useRef(new Set<string>());

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ["listing-feed"],
    queryFn: () => getListingFeed(50),
  });

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
          // Invalidate matches to check for new match
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        }
      } catch {
        // Swipe already recorded (409) is fine
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
