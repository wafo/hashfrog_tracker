const BUNDLED_VERSIONS = new Set(["9.0.0", "8.3.0", "devTFBlitz_"]);

const DEFAULT_OWNER = "OoTRandomizer";
const FALLBACK_VERSION = "9.0.0";

/**
 * Checks if a version has bundled logic files.
 * @param {string} version - The version string to check.
 * @returns {boolean} True if the version is bundled.
 */
function isBundled(version) {
  return BUNDLED_VERSIONS.has(version);
}

/**
 * Dynamically imports bundled logic files for a version.
 * @param {string} version - The version string.
 * @returns {Promise<object|null>} The bundle or null if not bundled.
 */
async function getBundledLogicFiles(version) {
  if (!isBundled(version)) {
    return null;
  }

  const bundle = await import(`./bundles/${version}/index.js`);
  return bundle.default;
}

/**
 * Parses a version string into owner and tag, supporting fork syntax.
 * @param {string} version - The version string (e.g. "9.0.0" or "owner/tag").
 * @returns {{owner: string, tag: string}} The parsed owner and tag.
 */
function parseVersion(version) {
  if (!version) {
    return { owner: DEFAULT_OWNER, tag: FALLBACK_VERSION };
  }

  // Fork syntax: owner/tag
  if (version.includes("/")) {
    const [owner, ...tagParts] = version.split("/");
    return { owner, tag: tagParts.join("/") };
  }

  // Main repo
  return { owner: DEFAULT_OWNER, tag: version };
}

/**
 * Returns the fallback version string.
 * @returns {string} The fallback version.
 */
function getFallbackVersion() {
  return FALLBACK_VERSION;
}

/**
 * Loads bundled logic files for the fallback version.
 * @returns {Promise<object>} The fallback bundle.
 */
async function getFallbackLogicFiles() {
  return getBundledLogicFiles(FALLBACK_VERSION);
}

/**
 * Normalizes a version string (strips "v" prefix, adds .0 patch if needed).
 * @param {string} version - The raw version string.
 * @returns {string} The normalized version.
 */
function normalizeVersion(version) {
  if (!version) {
    return FALLBACK_VERSION;
  }

  // Dev versions pass through unchanged
  if (version.startsWith("dev")) {
    return version;
  }

  // Remove leading "v" if present
  let normalized = version.startsWith("v") ? version.slice(1) : version;

  // Add .0 patch version if only major.minor provided
  const parts = normalized.split(".");
  if (parts.length === 2) {
    normalized = `${normalized}.0`;
  }

  return normalized;
}

const VersionConfig = {
  DEFAULT_OWNER,
  FALLBACK_VERSION,
  isBundled,
  getBundledLogicFiles,
  parseVersion,
  getFallbackVersion,
  getFallbackLogicFiles,
  normalizeVersion,
};

export default VersionConfig;
