import { useState, useEffect } from "react";

import Checks from "./Checks";
import Layout from "./Layout";
import "../noscroll.css";

import LogicLoader from "../utils/logic-loader";
import Locations from "../utils/locations";

const TrackerChecks = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LogicLoader.loadLogicFiles().then(({ logicHelpersFile, dungeonFiles, overworldFile }) => {
      Locations.initialize(dungeonFiles, overworldFile);
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
