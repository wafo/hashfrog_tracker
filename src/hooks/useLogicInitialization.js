import { useCallback, useEffect, useState } from "react";

import { getGeneratorVersionCache, getSettingsStringCache, useItems } from "../context/trackerContext";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";

const useLogicInitialization = (options = {}) => {
  const { skip = false } = options;
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { updateItemsFromLogic } = useItems();

  const initializeLogic = useCallback(async () => {
    if (skip) return;

    try {
      setIsLoading(true);
      setError(null);

      const generatorVersion = getGeneratorVersionCache();
      const settingsString = getSettingsStringCache();

      // Load logic files for the specific generator version
      const { logicHelpersFile, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } =
        await LogicLoader.loadLogicFiles(generatorVersion);

      Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile);

      // Getting settings from hashfrog backend instead of parsing them here.
      // Backend gets them from the generator endpoint and caches them.
      const { settings } = await fetch(
        `${process.env.REACT_APP_API_URL}/settings/string?` +
        new URLSearchParams({
          version: generatorVersion,
          settingsString: settingsString,
        }),
      ).then(response => response.json());

      LogicHelper.initialize(logicHelpersFile, settings);
      updateItemsFromLogic(settings); // Starting items.
      setIsInitialized(true);
    } catch (err) {
      console.error(err);
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
