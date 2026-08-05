import { useSessionRestore } from "../context/trackerContext";
import Layout from "./Layout";

const TrackerLayout = () => {
  useSessionRestore(true);

  return (
    <div className="">
      <Layout />
    </div>
  );
};

export default TrackerLayout;
