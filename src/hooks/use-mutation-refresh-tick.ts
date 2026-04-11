"use client";

import { useEffect, useState } from "react";
import { subscribeDataMutation } from "@/lib/mutation-sync";

export function useMutationRefreshTick(pathPrefixes: string[]): number {
  const [refreshTick, setRefreshTick] = useState(0);
  const prefixKey = pathPrefixes.join("|");

  useEffect(() => {
    const normalized = pathPrefixes
      .map((prefix) => String(prefix || "").trim())
      .filter(Boolean);

    if (normalized.length === 0) return;

    const unsubscribe = subscribeDataMutation((detail) => {
      if (!normalized.some((prefix) => detail.path.startsWith(prefix))) return;
      setRefreshTick((prev) => prev + 1);
    });

    return unsubscribe;
  }, [prefixKey]);

  return refreshTick;
}
