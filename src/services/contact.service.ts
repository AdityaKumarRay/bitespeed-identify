import { IdentifyRequest, IdentifyResponse } from "../types";
import { logger } from "../utils/logger";

/**
 * Core identity reconciliation logic.
 * Placeholder — full implementation in Commit 4.
 */
export async function identifyService(
  _input: IdentifyRequest,
): Promise<IdentifyResponse> {
  logger.debug("identifyService called", _input);

  // TODO: Implement in Commit 4
  return {
    contact: {
      primaryContatctId: 0,
      emails: [],
      phoneNumbers: [],
      secondaryContactIds: [],
    },
  };
}
