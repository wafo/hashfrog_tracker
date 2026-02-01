import frog from "../assets/icons/hashfrogsping.gif";
import useLogicInitialization from "../hooks/useLogicInitialization";
import Layout from "./Layout";

const TrackerLayout = () => {
  const { isLoading } = useLogicInitialization();

  if (isLoading) {
    return (
      <div className="w-100 d-flex flex-column align-items-center my-5">
        <img src={frog} alt="Frog" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="">
      <Layout />
    </div>
  );
};

export default TrackerLayout;
