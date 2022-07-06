import Checks from "./Checks/Checks";
import Layout from "./Layout/Layout";

const TrackerChecks = () => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <Layout />
      <Checks />
    </div>
  );
};

export default TrackerChecks;
