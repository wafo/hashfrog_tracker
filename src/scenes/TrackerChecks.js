import Checks from "./Checks/Checks";
import Tracker from "./Tracker/Tracker";

const TrackerChecks = () => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <Tracker />
      <Checks />
    </div>
  );
};

export default TrackerChecks;
