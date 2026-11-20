/** Server-side page cap for POST /v0/search/subjects (larger values are ignored). */
export const SEARCH_PAGE_SIZE = 20;

/** 4 parallel pages measured fastest (12 pages serial: 3.6 s, 3 batches of 4: ~1.05 s). */
export const SEARCH_CONCURRENCY = 4;

/**
 * Page size for GET /v0/subjects (the browse endpoint used for seasons).
 * 100 is accepted by the server and keeps a month down to 1-2 requests
 * (limit 25 needs 4x as many round trips for the same data).
 */
export const BROWSE_PAGE_SIZE = 100;
