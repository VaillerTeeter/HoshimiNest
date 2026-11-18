/** Server-side page cap for POST /v0/search/subjects (larger values are ignored). */
export const SEARCH_PAGE_SIZE = 20;

/** 4 parallel pages measured fastest (12 pages serial: 3.6 s, 3 batches of 4: ~1.05 s). */
export const SEARCH_CONCURRENCY = 4;
