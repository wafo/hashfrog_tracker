import { useEffect, useState } from "react";

import Checks from "./Checks";
import Layout from "./Layout";
import frog from "../assets/icons/hashfrogsping.gif";

import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";
import { useItems } from "../context/trackerContext";

const TrackerChecks = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { updateItemsFromLogic } = useItems();

  useEffect(() => {
    LogicLoader.loadLogicFiles().then(({ logicHelpersFile, dungeonFiles, overworldFile }) => {
      Locations.initialize(dungeonFiles, overworldFile);
      const settings = LogicHelper.initialize(logicHelpersFile);
      updateItemsFromLogic(settings); // Starting items.
      setIsLoading(false);
    });
  }, [updateItemsFromLogic]);

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
