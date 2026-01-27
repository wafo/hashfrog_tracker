const BUNDLED_VERSIONS = new Set(["v9.0", "v8.3"]);

const DEFAULT_OWNER = "OoTRandomizer";
const FALLBACK_VERSION = "v9.0";

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

  return version;
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
