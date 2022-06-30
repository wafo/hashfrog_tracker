import { useState } from "react";
import Footer from "../../components/Footer";
import styles from "./Welcome.module.css";
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
    <div className={styles.container}>
      <div className={styles.left}>
        <h1>HashFrog Tracker</h1>
        <p>
          This is a tracker for the{" "}
          <a href="https://ootrandomizer.com/">Ocarina of Time Randomizer</a>.
        </p>
        <p>
          The motivation behind this project is to have a simple customizable
          tracker that will help keep track of all the checks in the game.
        </p>
        <h3>TODO</h3>
        <p>
          These are in no order and I make no promises of when I&apos;ll get to
          them.
        </p>
        <ul>
          <li>Basic customization like font, colors, etc.</li>
          <li>Layout customization UI and funtionality.</li>
          <li>Storing layout configurations.</li>
          <li>Creating custom elements for the tracker.</li>
          <li>Saving tracking sessions.</li>
        </ul>
        <h3>Changelog</h3>
        <ul>
          <li>
            0.3.4 - All check tracking logic changed to standard glitchless
            logic.
          </li>
        </ul>
        <div style={{ margin: "3rem 0" }} />
        <Footer />
      </div>
      <div className={styles.right}>
        <button type="button" onClick={launchTracker}>
          Launch tracker
        </button>
        <div className={styles.configuration}>
          <input
            type="checkbox"
            id="checks"
            name="checks"
            value={checks}
            onChange={() => setChecks((prev) => !prev)}
          />
          <label htmlFor="checks"> Use check tracking. *</label>
        </div>
        <h3>Notes</h3>
        <p>
          * Check tracking is based on glitchless logic and common enabled
          tricks.
        </p>
        <ul>
          <li>Hidden Grottos without Stone of Agony</li>
          <li>Man on Roof without Hookshot</li>
          <li>Windmill PoH as Adult with Nothing</li>
          <li>Craters Bean PoH with Hover Boots</li>
          <li>Ignoring age requirements</li>
        </ul>
      </div>
    </div>
  );
};

export default Welcome;
