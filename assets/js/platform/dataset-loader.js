// platform/dataset-loader.js

/**
 * Fetches and schema-checks a kata's dataset, cached by URL.
 *
 * Katas that share one file share one request. A failure evicts the entry so
 * the next attempt really refetches instead of replaying the same rejection.
 */
export function createDatasetLoader(fetchImpl = (...args) => fetch(...args)) {
  const cache = new Map(); // dataset URL -> Promise<dataset>

  return {
    /** @param {{ id: string, datasetUrl: string, validateDataset: (data: unknown) => void }} kata */
    load(kata) {
      const { id, datasetUrl } = kata;
      if (!cache.has(datasetUrl)) {
        cache.set(datasetUrl, fetchImpl(datasetUrl)
          .then((response) => {
            if (!response.ok) throw new Error(`Failed to load dataset for "${id}".`);
            return response.json();
          })
          .then((dataset) => {
            try {
              kata.validateDataset(dataset);
            } catch (error) {
              throw new Error(`Invalid dataset for "${id}": ${error.message}`);
            }
            return dataset;
          })
          .catch((error) => {
            cache.delete(datasetUrl);
            throw error;
          }));
      }
      return cache.get(datasetUrl);
    },
  };
}
