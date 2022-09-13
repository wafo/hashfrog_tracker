import { useEffect, useState } from "react";

import Checks from "./Checks";
import Layout from "./Layout";
import frog from "../assets/icons/hashfrogsping.gif";

import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";
import { getGeneratorVersionCache, getSettingsStringCache, useItems } from "../context/trackerContext";
import { useCallback } from "react";

const TrackerChecks = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { updateItemsFromLogic } = useItems();

  const initializeLogic = useCallback(async () => {
    const { logicHelpersFile, dungeonFiles, overworldFile } = await LogicLoader.loadLogicFiles();

    Locations.initialize(dungeonFiles, overworldFile);

    // Getting settings from hashfrog backend instead of parsing them here.
    // Backend gets them from the generator endpoint and caches them.
    const { settings } = await fetch(
      `${process.env.REACT_APP_API_URL}/settings/string?` +
        new URLSearchParams({
          version: getGeneratorVersionCache(),
          settingsString: getSettingsStringCache(),
        }),
    ).then(response => response.json());

    LogicHelper.initialize(logicHelpersFile, settings);
    updateItemsFromLogic(settings); // Starting items.
    setIsLoading(false);
  }, [updateItemsFromLogic]);

  useEffect(() => {
    initializeLogic();
  }, [initializeLogic]);

  if (isLoading) {
    return (
      <div className="w-100 d-flex flex-column align-items-center flex-direction-column my-5">
        <img src={frog} alt="Frog" />
        <span>Loading...</span>
      </div>
    );
  } else {
    return (
      <div className="d-flex justify-content-between">
        <Layout />
        <Checks />
      </div>
    );
  }
};

export default TrackerChecks;
