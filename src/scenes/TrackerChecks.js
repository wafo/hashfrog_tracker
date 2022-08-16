import { useEffect, useState } from "react";

import "../noscroll.css";
import Checks from "./Checks";
import Layout from "./Layout";

import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import LogicLoader from "../utils/logic-loader";

const TrackerChecks = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LogicLoader.loadLogicFiles().then(({ logicHelpersFile, dungeonFiles, overworldFile }) => {
      Locations.initialize(dungeonFiles, overworldFile);
      LogicHelper.initialize(logicHelpersFile);
      setIsLoading(false);
    });
  }, []);

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
