"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Resource {
    id: string;
    title: string;
    url: string;
}

interface ResourcesByStep {
    [stepId: string]: Resource[];
}

interface PollingResponse {
    resources: ResourcesByStep;
    allCurated: boolean;
    totalSteps: number;
    stepsWithResources: number;
}

interface UsePollingResourcesResult {
    resources: ResourcesByStep;
    isPolling: boolean;
    allCurated: boolean;
    error: string | null;
}

/**
 * Custom hook for polling goal resources.
 * 
 * - Fetches resources on mount
 * - Polls at configurable interval (default: 3 seconds)
 * - Stops polling when all resources are curated
 * - Cleans up interval on unmount
 * 
 * @param goalId - The ID of the goal to poll resources for
 * @param interval - Polling interval in milliseconds (default: 10000)
 * @param enabled - Whether polling should be enabled (default: true)
 */
export function usePollingResources(
    goalId: string,
    interval: number = 10000,
    enabled: boolean = true
): UsePollingResourcesResult {
    const [resources, setResources] = useState<ResourcesByStep>({});
    const [isPolling, setIsPolling] = useState(false);
    const [allCurated, setAllCurated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use ref to track if component is mounted
    const isMountedRef = useRef(true);

    const fetchResources = useCallback(async () => {
        if (!goalId) return;

        try {
            const response = await fetch(`/api/goals/${goalId}/resources`);

            if (!response.ok) {
                throw new Error(`Failed to fetch resources: ${response.status}`);
            }

            const data: PollingResponse = await response.json();

            // Only update state if component is still mounted
            if (isMountedRef.current) {
                setResources(data.resources);
                setAllCurated(data.allCurated);
                setError(null);

                if (data.allCurated) {
                    console.log(`[usePollingResources] All resources curated for goal ${goalId}, stopping poll`);
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setError(errorMessage);
                console.error(`[usePollingResources] Error fetching resources:`, err);
            }
        }
    }, [goalId]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!enabled || !goalId) {
            return;
        }

        // Initial fetch
        console.log(`[usePollingResources] Starting poll for goal ${goalId}`);
        setIsPolling(true);
        fetchResources();

        // Set up polling interval
        const intervalId = setInterval(() => {
            // Don't poll if already curated
            if (allCurated) {
                console.log(`[usePollingResources] All curated, clearing interval`);
                clearInterval(intervalId);
                setIsPolling(false);
                return;
            }

            fetchResources();
        }, interval);

        // Cleanup
        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
            setIsPolling(false);
            console.log(`[usePollingResources] Cleanup for goal ${goalId}`);
        };
    }, [goalId, interval, enabled, fetchResources, allCurated]);

    return { resources, isPolling, allCurated, error };
}
