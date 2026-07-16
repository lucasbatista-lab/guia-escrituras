export {
  SHARE_UTM_CONTENTS,
  isShareUtmContent,
  assertShareUtmContent,
  type ShareUtmContent,
} from "./origins";
export {
  SHARE_TITLE,
  SHARE_TEXT,
  SHARE_COPIED_FEEDBACK,
  buildShareMessage,
  buildWhatsAppShareHref,
  isUserShareCancellation,
} from "./copy";
export {
  sanitizeReferralCodeForShare,
  buildOrganicShareUrl,
  isOrganicShareUrl,
} from "./url";
export { copyTextToClipboard } from "./clipboard";
// resolve-server is server-only — import from @/lib/share/resolve-server
