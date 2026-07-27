import { useCallback, useEffect, useState } from "react";

import { getGeneratorVersionCache, getSettingsStringCache, useItems } from "../context/trackerContext";
import { setTooltipWarmingEnabled, warmRequirementsCache } from "../utils/expression-converter";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";
import SettingsHelper from "../utils/settings-helper";

const useLogicInitialization = (options = {}) => {
  const { skip = false, warmTooltips = false } = options;
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { updateItemsFromLogic } = useItems();

  const initializeLogic = useCallback(async () => {
    if (skip) { return; }

    try {
      setIsLoading(true);
      setError(null);

      const generatorVersion = getGeneratorVersionCache();
      const settingsString = getSettingsStringCache();

      // Load logic files for the specific generator version
      const bundle = await LogicLoader.loadLogicFiles(generatorVersion, settingsString);
      const { logicHelpersFile, locationTable, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } = bundle;

      // Initialize SettingsHelper with version-specific defaults
      SettingsHelper.initialize(bundle);

      Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile, locationTable);

      let settings;
      if (!settingsString) {
        settings = bundle.settingsDefaults;
      } else {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/settings/string?` +
          new URLSearchParams({
            version: generatorVersion,
            settingsString: settingsString,
          }),
        ).then(res => res.json());
        settings = response.settings;
      }

      // Apply defaults and old-name transformations first so LogicHelper sees normalized settings
      SettingsHelper.setSettings(settings);

      // LogicHelper post-processes settings (e.g. mq_dungeons_mode "mq" expands
      // mq_dungeons_specific to all dungeons), so set SettingsHelper from its result.
      const finalSettings = LogicHelper.initialize(logicHelpersFile, SettingsHelper.settings);

      SettingsHelper.setSettings(finalSettings);
      updateItemsFromLogic(finalSettings); // Starting items.
      setIsInitialized(true);

      // Pre-build tooltip region caches, but only for scenes that show tooltips.
      setTooltipWarmingEnabled(warmTooltips);
      setTimeout(warmRequirementsCache, 0);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [skip, warmTooltips, updateItemsFromLogic]);

  useEffect(() => {
    initializeLogic();
  }, [initializeLogic]);

  return { isLoading, error, isInitialized };
};

export default useLogicInitialization;
