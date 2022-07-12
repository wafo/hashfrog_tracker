import Footer from "../components/Footer";
import TrackerLauncher from "./TrackerLauncher";

const Welcome = () => {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col">
          <h1>HashFrog Tracker</h1>
        </div>
      </div>
      <div className="row justify-content-between">
        <div className="col-md-4">
          <TrackerLauncher />
        </div>
        <div className="col-md-7">
          <h3>About</h3>
          <p>
            This is a tracker for the <a href="https://ootrandomizer.com/">Ocarina of Time Randomizer</a>.
          </p>
          <p>
            The motivation behind this project is to have a simple customizable tracker that will help keep track of all
            the checks in the game.
          </p>
          <h3>Features</h3>
          <p>These are in no order and I make no promises of when I&apos;ll get to them.</p>
          <ul>
            <li>Basic customization like font, colors, etc.</li>
            <li>UI for layout customization.</li>
            <li>Storing layout configurations.</li>
            <li>Creating custom elements for the tracker.</li>
            <li>Saving tracking sessions.</li>
          </ul>
          <h3>Changelog</h3>
          <ul>
            <li>0.4.2 - QoL improvements for Layout Editor. New QoL functionalities.</li>
            <li>0.4.1 - Styling</li>
            <li>0.4.0 - Layout based of JSON file and editor UI (beta).</li>
            <li>0.3.4 - All check tracking logic changed to standard glitchless logic.</li>
          </ul>
          <div style={{ margin: "3rem 0" }} />
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
