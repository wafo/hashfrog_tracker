import _ from "lodash";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";

import frog from "../assets/icons/hashfrogsping.gif";
import LogicSourceWarning from "../components/LogicSourceWarning";
import { useSessionRestore, useTracker } from "../context/trackerContext";
import useLogicInitialization, { SettingsDecodeError } from "../hooks/useLogicInitialization";
import Checks from "./Checks";
import Layout from "./Layout";

const TrackerChecks = () => {
  const { isLoading, error, logicMeta, retry } = useLogicInitialization({ warmTooltips: true });
  const { state } = useTracker();

  // In checks mode the location structure is built by Checks.js after logic
  // loads; only then is it safe to overlay saved progress.
  useSessionRestore(!isLoading && !error && !_.isEmpty(state.locations));

  if (isLoading) {
    return (
      <div className="w-100 d-flex flex-column align-items-center flex-direction-column my-5">
        <img src={frog} alt="Frog" />
        <span>Loading...</span>
      </div>
    );
  }

  // Surface failures with a retry instead of rendering an empty tracker.
  if (error) {
    return (
      <div className="w-100 d-flex flex-column align-items-center my-5">
        <img src={frog} alt="Frog" />
        <Alert variant="danger" className="text-center mt-3" style={{ maxWidth: 500 }}>
          <p className="fw-bold mb-2">Could not load the game logic for check tracking.</p>
          <p className="small mb-0">
            {String(error?.message || error)}
          </p>
        </Alert>
        {/* Settings decode errors carry their own advice; only the logic-file ones need this hint. */}
        {!(error instanceof SettingsDecodeError) && (
          <p className="small text-secondary" style={{ maxWidth: 500 }}>
            Check that the generator version and settings string are correct, then try again. If the
            problem persists, the logic service may be temporarily unavailable.
          </p>
        )}
        <Button variant="light" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <LogicSourceWarning meta={logicMeta} />
      <div className="d-flex justify-content-between">
        <Layout />
        <Checks />
      </div>
    </>
  );
};

export default TrackerChecks;
