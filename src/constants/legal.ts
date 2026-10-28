/** Base of the published legal pages (privacy policy, account deletion). */
const LEGAL_SITE = 'https://mesan237.github.io/finance-gatekeeper-legal';

/** The privacy policy; Google Play requires a link to it inside the app. */
export const PRIVACY_POLICY_URL = `${LEGAL_SITE}/`;

/** How to delete the cloud account; Google Play requires an in-app path to it. */
export const ACCOUNT_DELETION_URL = `${LEGAL_SITE}/delete-account/`;
