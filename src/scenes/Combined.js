import Checks from "./Checks/Checks";
import Tracker from "./Tracker/Tracker";

const Combined = () => {
  return (
    <div style={{ display: "flex" }}>
      <Tracker />
      <Checks />
    </div>
  );
};

export default Combined;
