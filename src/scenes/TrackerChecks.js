import Checks from "./Checks";
import Layout from "./Layout";
import "../noscroll.css";

const TrackerChecks = () => {
  return (
    <div className="d-flex justify-content-between">
      <Layout />
      <Checks />
    </div>
  );
};

export default TrackerChecks;
