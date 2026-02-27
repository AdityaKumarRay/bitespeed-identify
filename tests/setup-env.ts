/**
 * Jest setup — runs before each test suite.
 *
 * • Loads .env so integration tests work locally without
 *   manually exporting DATABASE_URL.
 * • Sets NODE_ENV=test if not already set.
 */
import "dotenv/config";

process.env.NODE_ENV ??= "test";
