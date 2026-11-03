import { isEFK } from "../utils/efk";
import { DEFAULT_OWNER, DEV_FORK_BRANCHES } from "./dev-branches";

const BUNDLED_VERSIONS = new Set(["9.0.0", "8.3.0"]);

// EFK is handled separately from BUNDLED_VERSIONS and relies instead on isEFK().
const EFK_BUNDLE = "EFK";

const FALLBACK_VERSION = "9.0.0";

// A reported build, as a base version and an optional build number: "9.1.28", "9.0.2-17".
const REPORTED_BUILD = /^(\d+(?:\.\d+)*)(?:-(.+))?$/;

// The generator's seed pages name a dev build by its branch, but both the settings service and the
// logic files areaddressed by the prefix that the generator itself reports.
// That prefix appears nowhere on the page, so accept the displayed name too.
// Keyed off the branch list above so it cannot drift, using each fork's own display name where its branch name alone would be ambiguous.
const BRANCH_DISPLAY_NAMES = Object.fromEntries(
  Object.entries(DEV_FORK_BRANCHES).map(([prefix, fork]) => [(fork.displayName ?? fork.tag).toLowerCase(), prefix]),
);

// A branch name on its own, or followed by the build it produced: "Dev-Rob", "Dev-Rob v9.0.2-17", "Dev 9.1.29".
const DISPLAYED_BRANCH = /^([A-Za-z][A-Za-z0-9_-]*)(?:\s+v?(\S+))?$/;

/**
 * Checks if a version has bundled logic files.
 * @param {string} version - The version string to check.
 * @param {string} [settingsString] - The settings string, used to detect the EFK bundle.
 * @returns {boolean} True if the version is bundled.
 */
function isBundled(version, settingsString) {
  return isEFK(settingsString) || BUNDLED_VERSIONS.has(version);
}

/**
 * Dynamically imports bundled logic files for a version.
 * @param {string} version - The version string.
 * @param {string} [settingsString] - The settings string, used to detect the EFK bundle.
 * @returns {Promise<object|null>} The bundle or null if not bundled.
 */
async function getBundledLogicFiles(version, settingsString) {
  if (!isBundled(version, settingsString)) {
    return null;
  }

  const bundleName = isEFK(settingsString) ? EFK_BUNDLE : version;
  const bundle = await import(`./bundles/${bundleName}/index.js`);
  return bundle.default;
}

/**
 * Work out the tag a fork publishes a specific build under.
 * @param {object} fork - The entry from DEV_FORK_BRANCHES.
 * @param {string} reportedBuild - The part of the version string after the prefix, e.g. "9.0.2-17".
 * @returns {string|null} The exact tag, or null when this fork has no derivable one.
 */
function exactBuildTag(fork, reportedBuild) {
  if (!fork.buildTag) { return null; }

  const parts = reportedBuild.match(REPORTED_BUILD);
  if (!parts) { return null; }

  return fork.buildTag(parts[1], parts[2]) || null;
}

/**
 * Parses a version string into the repository and refs its logic files live at.
 * @param {string} version - The version string (e.g. "9.0.0", "devrreal_9.0.2-17" or "owner/tag").
 * @returns {{owner: string, tag: string, exactTag: string|null}} The repository owner, the ref to fall back on
 *   (a branch for dev versions, a release tag otherwise), and the exact build's tag when one can be derived.
 */
function parseVersion(version) {
  if (!version) {
    return { owner: DEFAULT_OWNER, tag: FALLBACK_VERSION, exactTag: null };
  }

  // Fork syntax: owner/tag.
  // The caller named a ref outright, so there is nothing to derive.
  if (version.includes("/")) {
    const [owner, ...tagParts] = version.split("/");
    return { owner, tag: tagParts.join("/"), exactTag: null };
  }

  // Known dev fork versions
  for (const [prefix, fork] of Object.entries(DEV_FORK_BRANCHES)) {
    if (version.startsWith(prefix)) {
      return {
        owner: fork.owner,
        tag: fork.tag,
        exactTag: exactBuildTag(fork, version.slice(prefix.length)),
      };
    }
  }

  // Upstream tags the first release of a minor line as "vX.Y"
  // normalizeVersion pads a bare "9.1" out to "9.1.0", and the generator reports that same dotted form, so translate it back.
  const firstReleaseOfLine = version.match(/^(\d+)\.(\d+)\.0$/);
  if (firstReleaseOfLine) {
    return { owner: DEFAULT_OWNER, tag: `v${firstReleaseOfLine[1]}.${firstReleaseOfLine[2]}`, exactTag: null };
  }

  // Main repo
  return { owner: DEFAULT_OWNER, tag: version, exactTag: null };
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
 * Normalizes a version string into the form the generator itself reports.
 *
 * Folds a branch name as a seed page displays it into its version prefix, strips a leading "v", and
 * pads a bare major.minor out to a patch version.
 * Already-normalized versions pass through unchanged.
 * @param {string} version - The raw version string, as typed or as saved.
 * @returns {string} The normalized version.
 */
function normalizeVersion(version) {
  if (!version) {
    return FALLBACK_VERSION;
  }

  const trimmed = version.trim();

  // A branch name as the seed page shows it
  const displayedBranch = trimmed.match(DISPLAYED_BRANCH);
  const branchPrefix = displayedBranch && BRANCH_DISPLAY_NAMES[displayedBranch[1].toLowerCase()];
  if (branchPrefix) {
    return `${branchPrefix}${displayedBranch[2] ?? ""}`;
  }

  // Dev versions pass through unchanged
  if (trimmed.startsWith("dev")) {
    return trimmed;
  }

  // Remove leading "v" if present
  let normalized = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;

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
