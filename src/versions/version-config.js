const BUNDLED_VERSIONS = new Set(["9.0.0", "8.3.0"]);

const DEFAULT_OWNER = "OoTRandomizer";
const FALLBACK_VERSION = "9.0.0";

function isBundled(version) {
  return BUNDLED_VERSIONS.has(version);
}

async function getBundledLogicFiles(version) {
  if (!isBundled(version)) {
    return null;
  }

  const bundle = await import(`./bundles/${version}/index.js`);
  return bundle.default;
}

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

function getFallbackVersion() {
  return FALLBACK_VERSION;
}

async function getFallbackLogicFiles() {
  return getBundledLogicFiles(FALLBACK_VERSION);
}

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
