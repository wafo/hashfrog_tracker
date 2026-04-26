import { useCallback, useEffect, useState } from "react";

import { getGeneratorVersionCache, getSettingsStringCache, useItems } from "../context/trackerContext";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";
import SettingsHelper from "../utils/settings-helper";

const useLogicInitialization = (options = {}) => {
  const { skip = false } = options;
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
      const { logicHelpersFile, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } = bundle;

      // Initialize SettingsHelper with version-specific defaults
      SettingsHelper.initialize(bundle);

      Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile);

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

      // Set settings on SettingsHelper
      SettingsHelper.setSettings(settings);

      LogicHelper.initialize(logicHelpersFile, settings);
      updateItemsFromLogic(settings); // Starting items.
      setIsInitialized(true);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [skip, updateItemsFromLogic]);

  useEffect(() => {
    initializeLogic();
  }, [initializeLogic]);

  return { isLoading, error, isInitialized };
};

export default useLogicInitialization;
