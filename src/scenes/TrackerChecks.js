import { useEffect, useState } from "react";

import "../noscroll.css";
import Checks from "./Checks";
import Layout from "./Layout";

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
      updateItemsFromLogic([...settings.starting_equipment, ...settings.starting_items, ...settings.starting_songs]);
      setIsLoading(false);
    });
  }, [updateItemsFromLogic]);

  if (isLoading) {
    return <div>Loading...</div>;
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
