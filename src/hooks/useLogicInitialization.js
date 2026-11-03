import { useCallback, useEffect, useRef, useState } from "react";

import { getGeneratorVersionCache, getSettingsStringCache, useItems } from "../context/trackerContext";
import { setTooltipWarmingEnabled, warmRequirementsCache } from "../utils/expression-converter";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";
import SettingsHelper from "../utils/settings-helper";

const SETTINGS_DECODE_TIMEOUT_MS = 10000;
const LOGIC_FILES_TIMEOUT_MS = 30000;

// SettingsHelper builds Sets from the first group, and the items reducer spreads the starting-item lists,
// so a non-list value in any of these would throw far away from the response that caused it.
const LIST_SETTINGS = [
  "mq_dungeons_specific",
  "dungeon_shortcuts",
  "allowed_tricks",
  "advanced_allowed_tricks",
  "adult_trade_start",
  "shuffle_child_trade",
  "disabled_locations",
  "starting_equipment",
  "starting_inventory",
  "starting_songs",
];

const CHECK_STRING_HINT = "Check the settings string and generator version, then try again.";

/** A failure to decode the settings string, whose message already tells the player what to do. */
export class SettingsDecodeError extends Error {
  name = "SettingsDecodeError";
}

/**
 * Check that a decoded-settings response looks like settings before it reaches the logic.
 * Unknown keys remain allowed on purpose: forks add settings this tracker has never seen.
 * @param {unknown} settings - The `settings` field of the API response.
 * @returns {object} The validated settings object.
 * @throws {Error} When the response is not a usable settings object.
 */
const validateDecodedSettings = settings => {
  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) {
    throw new SettingsDecodeError(`The settings service returned an unexpected response. ${CHECK_STRING_HINT}`);
  }

  const badLists = LIST_SETTINGS.filter(key => key in settings && !Array.isArray(settings[key]));
  if (badLists.length) {
    throw new SettingsDecodeError(`The decoded settings look corrupted (${badLists.join(", ")} should be lists). ${CHECK_STRING_HINT}`);
  }

  if ("bridge" in settings && typeof settings.bridge !== "string") {
    throw new SettingsDecodeError(`The decoded settings look corrupted (bridge should be text). ${CHECK_STRING_HINT}`);
  }

  return settings;
};

// What to tell the player for each error status of the settings endpoint.
// Only a 400 means the settings string itself is at fault; everything else is worth retrying as-is.
const STATUS_MESSAGES = {
  400: `The generator could not decode this settings string for this generator version. ${CHECK_STRING_HINT}`,
  429: "Too many new settings strings were decoded from your connection. Wait a minute and try again.",
  502: "The generator is having trouble right now. Try again in a moment.",
  504: "The generator did not respond in time. Try again in a moment.",
};

/**
 * Decode a settings string through the tracker's settings endpoint, failing loudly on anything unusable.
 *
 * Every failure throws instead of returning undefined.
 * This prevents a session from running on silently applied default settings.
 * @param {string} generatorVersion - Generator version the string was made with.
 * @param {string} settingsString - The settings string to decode.
 * @param {AbortSignal} signal - Abort signal for timeout/unmount cancellation.
 * @returns {Promise<object>} The decoded settings.
 * @throws {Error} When the service is unreachable, errors, or returns a malformed body.
 */
export const fetchDecodedSettings = async (generatorVersion, settingsString, signal) => {
  const url =
    "/api/settings/string?" +
    new URLSearchParams({
      version: generatorVersion,
      settingsString: settingsString,
    });

  let response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new SettingsDecodeError("The settings service did not respond in time. Check your connection and try again.");
    }
    throw new SettingsDecodeError("Could not reach the settings service. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new SettingsDecodeError(
      STATUS_MESSAGES[response.status] ??
        `The settings service could not decode the settings string (status ${response.status}). Try again in a moment.`,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new SettingsDecodeError("The settings service did not respond in time. Check your connection and try again.");
    }
    throw new SettingsDecodeError("The settings service returned an unreadable response. Try again in a moment.");
  }

  return validateDecodedSettings(body?.settings);
};

const useLogicInitialization = (options = {}) => {
  const { skip = false, warmTooltips = false } = options;
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // Where the logic files came from (requested vs. resolved version, fallback reason, warnings)
  const [logicMeta, setLogicMeta] = useState(null);
  const { updateItemsFromLogic } = useItems();

  // Bumped by every (re)initialization and unmount.
  // This prevents an abandoned run's late responses from overwriting the state of a newer one.
  const generationRef = useRef(0);
  const abortRef = useRef(null);

  const initializeLogic = useCallback(async () => {
    if (skip) { return; }

    generationRef.current += 1;
    const generation = generationRef.current;
    const isStale = () => generationRef.current !== generation;

    abortRef.current?.abort("cancelled");
    const withDeadline = async (ms, run) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timer = setTimeout(() => controller.abort("timeout"), ms);
      try {
        return await run(controller.signal);
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      setIsLoading(true);
      setError(null);
      setIsInitialized(false);
      setLogicMeta(null);

      const generatorVersion = getGeneratorVersionCache();
      const settingsString = getSettingsStringCache();

      if (!settingsString) {
        throw new Error(
          "No settings string was provided. Launch the tracker from the main page with a settings string or preset.",
        );
      }

      // Load logic files for the specific generator version
      const { files: bundle, meta } = await withDeadline(LOGIC_FILES_TIMEOUT_MS, signal =>
        LogicLoader.loadLogicFiles(generatorVersion, settingsString, { signal }),
      );
      if (isStale()) { return; }
      const { logicHelpersFile, locationTable, boulderTable, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } =
        bundle;
      // Initialize SettingsHelper with version-specific defaults
      SettingsHelper.initialize(bundle);

      Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile, locationTable);

      // Locations with unparseable rules are left out of the tracker
      const hiddenChecks = Locations.hiddenCheckNames.size;
      const warnings = hiddenChecks
        ? [
          ...meta.warnings,
          `${hiddenChecks} check${hiddenChecks === 1 ? "" : "s"} could not be understood and will not be shown. ` +
          "See the browser console for details.",
        ]
        : meta.warnings;
      setLogicMeta({ ...meta, warnings });

      const settings = await withDeadline(SETTINGS_DECODE_TIMEOUT_MS, signal =>
        fetchDecodedSettings(generatorVersion, settingsString, signal),
      );
      if (isStale()) { return; }

      // Apply defaults and old-name transformations first so LogicHelper sees normalized settings
      SettingsHelper.setSettings(settings);

      // LogicHelper post-processes settings (e.g. mq_dungeons_mode "mq" expands
      // mq_dungeons_specific to all dungeons), so set SettingsHelper from its result.
      const finalSettings = LogicHelper.initialize(logicHelpersFile, SettingsHelper.settings, boulderTable);

      SettingsHelper.setSettings(finalSettings);
      updateItemsFromLogic(finalSettings); // Starting items.
      setIsInitialized(true);

      // Pre-build tooltip region caches, but only for scenes that show tooltips.
      setTooltipWarmingEnabled(warmTooltips);
      setTimeout(() => {
        if (!isStale()) { warmRequirementsCache(); }
      }, 0);
    } catch (err) {
      if (!isStale()) { setError(err); }
    } finally {
      if (!isStale()) { setIsLoading(false); }
    }
  }, [skip, warmTooltips, updateItemsFromLogic]);

  useEffect(() => {
    initializeLogic();

    return () => {
      // Stop an in-flight run from touching state (or the network) after unmount.
      generationRef.current += 1;
      abortRef.current?.abort("cancelled");
    };
  }, [initializeLogic]);

  return { isLoading, error, isInitialized, logicMeta, retry: initializeLogic };
};

export default useLogicInitialization;
