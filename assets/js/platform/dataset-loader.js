// platform/dataset-loader.js

// Cached by URL, so katas sharing a file share one request; a failure evicts the entry so the next call refetches.
export function createDatasetLoader(fetchImpl = (...args) => fetch(...args)) {
  const cache = new Map(); // dataset URL -> Promise<dataset>

  return {
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
