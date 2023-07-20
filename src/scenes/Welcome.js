import Footer from "../components/Footer";
import TrackerLauncher from "./TrackerLauncher";

import profile_tanjo3 from "../assets/contributors/tanjo3.jpg";
import profile_wafo from "../assets/contributors/wafo.png";

const Welcome = () => {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col">
          <h1>HashFrog Tracker</h1>
        </div>
      </div>
      <div className="row justify-content-between">
        <div className="col-md-6">
          <TrackerLauncher />
        </div>
        <div className="col-md-6">
          <h3>About</h3>
          <p>
            This is a tracker for the <a href="https://ootrandomizer.com/">Ocarina of Time Randomizer</a>.
          </p>
          <p>
            The motivation behind this project is to have a simple customizable tracker that will help keep track of all
            the checks in the game.
          </p>
          <h3>Features</h3>
          <ul>
            <li>Layout customization, UI editor, custom elements/icons and more.</li>
            <li>Store and share layout configuration in JSON files.</li>
            <li>Check/Location tracking based on the randomizer generator logic.</li>
          </ul>
          <h3>Changelog</h3>
          <ul>
            <li>
              0.6.3 - Bug fixes, performance improvements and dungeon related logic changes (boss keys are now taken
              into account and new key designs have been added).
            </li>
            <li>0.6.0 - Separation of release and dev logic branches.</li>
            <li>0.5.x - Logic parsing from the generator including setting string parsing and counters.</li>
            {/* <li>0.5.5 - Counters (small keys & skulls) now hooked to the logic.</li>
            <li>0.5.3 - Skulls available counter.</li>
            <li>0.5.2 - Settings string parsing directly from the generator. General bug fixes.</li>
            <li>0.5.1 - Starting items from settings. General bug fixes.</li>
            <li>0.5.0 - Logic funtionality parsing logic from the randomizer generator.</li> */}
            <li>
              0.4.x - Layout based of JSON file and editor UI. Custom Elements in Layout and Editor. Cached icons for
              improved performance.
            </li>
            {/* <li>0.4.4 - Custom Elements in Layout and Editor.</li>
            <li>0.4.3 - Cached icons for improved performance. No more lag when clicking icons for the first time.</li>
            <li>0.4.2 - QoL improvements for Layout Editor. New QoL functionalities.</li>
            <li>0.4.1 - Styling</li>
            <li>0.4.0 - Layout based of JSON file and editor UI (beta).</li>
            <li>0.3.4 - All check tracking logic changed to standard glitchless logic.</li> */}
          </ul>
          <h3>Contributors</h3>
          <ul className="list-unstyled list-horizontal contributors">
            <li>
              <a href="https://www.twitch.tv/tanjo3" target="_blank" rel="noreferrer">
                <img src={profile_tanjo3} alt="tanjo3" className="contributor-profile" title="tanjo3" />
              </a>
            </li>
            <li>
              <a href="https://www.twitch.tv/elwafo" target="_blank" rel="noreferrer">
                <img src={profile_wafo} alt="Wafo" className="contributor-profile" title="Wafo" />
              </a>
            </li>
          </ul>
          <div style={{ margin: "3rem 0" }} />
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
