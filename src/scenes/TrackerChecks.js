import frog from "../assets/icons/hashfrogsping.gif";
import useLogicInitialization from "../hooks/useLogicInitialization";
import Checks from "./Checks";
import Layout from "./Layout";

const TrackerChecks = () => {
  const { isLoading } = useLogicInitialization();

  if (isLoading) {
    return (
      <div className="w-100 d-flex flex-column align-items-center flex-direction-column my-5">
        <img src={frog} alt="Frog" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-between">
      <Layout />
      <Checks />
    </div>
  );
};

export default TrackerChecks;
