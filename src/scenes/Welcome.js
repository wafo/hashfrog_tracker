import Footer from "../components/Footer";
import TrackerLauncher from "./TrackerLauncher";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";

import profile_tanjo3 from "../assets/contributors/tanjo3.jpg";
import profile_wafo from "../assets/contributors/wafo.png";

const Welcome = () => {
  return (
    <div className="container py-5">
      {/* Header */}
      <header className="mb-5 text-center">
        <h1 className="display-4 fw-bold mb-2">
          HashFrog Tracker
        </h1>
        <p className="lead text-secondary mb-0">
          A customizable tracker for Ocarina of Time Randomizer
        </p>
      </header>

      <div className="row g-4">
        {/* Left Column - Launcher */}
        <div className="col-lg-6">
          <TrackerLauncher />
        </div>

        {/* Right Column - About & Info */}
        <div className="col-lg-6">
          <Card className="bg-dark border-secondary text-white mb-4">
            <Card.Body>
              <h5 className="card-title text-uppercase fw-bold text-white mb-3" style={{ letterSpacing: '0.05em' }}>
                About
              </h5>
              <p className="text-light mb-2">
                This is a tracker for the{" "}
                <a href="https://ootrandomizer.com/" className="text-info text-decoration-none">
                  Ocarina of Time Randomizer
                </a>.
              </p>
              <p className="text-secondary small mb-0">
                The motivation behind this project is to have a simple customizable tracker that will help
                keep track of all the checks in the game.
              </p>
            </Card.Body>
          </Card>

          <Accordion className="mb-4" flush>
            <Accordion.Item eventKey="0" className="bg-dark border-secondary">
              <Accordion.Header>
                <span className="fw-semibold">Features</span>
              </Accordion.Header>
              <Accordion.Body className="bg-dark text-light">
                <ul className="mb-0 ps-3">
                  <li className="mb-2">Layout customization, UI editor, custom elements/icons and more.</li>
                  <li className="mb-2">Store and share layout configuration in JSON files.</li>
                  <li>Check/Location tracking based on the randomizer generator logic.</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1" className="bg-dark border-secondary">
              <Accordion.Header>
                <span className="fw-semibold">Changelog</span>
              </Accordion.Header>
              <Accordion.Body className="bg-dark text-light">
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">
                    <Badge bg="success" className="me-2">0.6.3</Badge>
                    <span className="small">Bug fixes, performance improvements and dungeon related logic changes (boss keys are now taken into account and new key designs have been added).</span>
                  </li>
                  <li className="mb-2">
                    <Badge bg="secondary" className="me-2">0.6.0</Badge>
                    <span className="small">Separation of release and dev logic branches.</span>
                  </li>
                  <li className="mb-2">
                    <Badge bg="secondary" className="me-2">0.5.x</Badge>
                    <span className="small">Logic parsing from the generator including setting string parsing and counters.</span>
                  </li>
                  <li>
                    <Badge bg="secondary" className="me-2">0.4.x</Badge>
                    <span className="small">Layout based of JSON file and editor UI. Custom Elements in Layout and Editor. Cached icons for improved performance.</span>
                  </li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <Card className="bg-dark border-secondary text-white">
            <Card.Body>
              <h6 className="text-uppercase fw-bold text-white mb-3" style={{ letterSpacing: '0.05em' }}>
                Contributors
              </h6>
              <div className="d-flex gap-3 align-items-center">
                <a
                  href="https://www.twitch.tv/tanjo3"
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none"
                >
                  <img
                    src={profile_tanjo3}
                    alt="tanjo3"
                    className="rounded-circle border border-2 border-info"
                    style={{ width: 48, height: 48 }}
                    title="tanjo3"
                  />
                </a>
                <a
                  href="https://www.twitch.tv/elwafo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none"
                >
                  <img
                    src={profile_wafo}
                    alt="Wafo"
                    className="rounded-circle border border-2 border-info"
                    style={{ width: 48, height: 48 }}
                    title="Wafo"
                  />
                </a>
              </div>
            </Card.Body>
          </Card>

          <div className="mt-4">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
