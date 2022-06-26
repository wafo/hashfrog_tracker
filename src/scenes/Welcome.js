import { Fragment } from "react";

const Welcome = () => {
  const launchTracker = () => {
    const url = "http://localhost:3000/tracker";
    window.open(
      url,
      "HashFrog Tracker",
      "toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=331,height=690"
    );
  };

  return (
    <Fragment>
      <button type="button" onClick={launchTracker}>
        Launch tracker
      </button>
    </Fragment>
  );
};

export default Welcome;
