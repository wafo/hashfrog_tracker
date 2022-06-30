import { Fragment, useState } from "react";
import About from "./About";
const baseURL = process.env.PUBLIC_URL;

const Welcome = () => {
  const [checks, setChecks] = useState(false);

  const launchTracker = () => {
    if (checks) {
      const url = `${baseURL}/tracker/checks`;
      window.open(
        url,
        "HashFrog Tracker",
        "toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=600,height=690"
      );
    } else {
      const url = `${baseURL}/tracker`;
      window.open(
        url,
        "HashFrog Tracker",
        "toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=331,height=690"
      );
    }
  };

  return (
    <Fragment>
      <div style={{ color: "#fff" }}>
        <button type="button" onClick={launchTracker}>
          Launch tracker
        </button>
      </div>
      <div>
        <input
          type="checkbox"
          id="checks"
          name="checks"
          value={checks}
          onChange={() => setChecks((prev) => !prev)}
        />
        <label htmlFor="checks"> Use check tracking</label>
      </div>
      <About />
    </Fragment>
  );
};

export default Welcome;
