import Footer from "../../components/Footer";
import TrackerLauncher from "../TrackerLauncher";
import styles from "./Welcome.module.css";

const Welcome = () => {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <h1>HashFrog Tracker</h1>
        <p>
          This is a tracker for the <a href="https://ootrandomizer.com/">Ocarina of Time Randomizer</a>.
        </p>
        <p>
          The motivation behind this project is to have a simple customizable tracker that will help keep track of all
          the checks in the game.
        </p>
        <h3>TODO</h3>
        <p>These are in no order and I make no promises of when I&apos;ll get to them.</p>
        <ul>
          <li>Basic customization like font, colors, etc.</li>
          <li>Layout customization UI and funtionality.</li>
          <li>Storing layout configurations.</li>
          <li>Creating custom elements for the tracker.</li>
          <li>Saving tracking sessions.</li>
        </ul>
        <h3>Changelog</h3>
        <ul>
          <li>0.4.0 - Tracker layout based of JSON file and layout editor UI.</li>
          <li>0.3.4 - All check tracking logic changed to standard glitchless logic.</li>
        </ul>
        <div style={{ margin: "3rem 0" }} />
        <Footer />
      </div>
      <div className={styles.right}>
        <TrackerLauncher />
      </div>
    </div>
  );
};

export default Welcome;
