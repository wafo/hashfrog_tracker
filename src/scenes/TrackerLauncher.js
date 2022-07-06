import { Fragment, useCallback, useMemo, useState } from "react";
import LayoutSelector from "../components/LayoutSelector";
import { useLayout } from "../context/layoutContext";

const baseURL = process.env.PUBLIC_URL;

const TrackerLauncher = () => {
  const [checks, setChecks] = useState(false);
  const { state: layout } = useLayout();

  const layoutSize = useMemo(() => {
    const {
      layoutConfig: { width, height },
    } = layout;

    // Default padding to layouts
    let widthPadding = 15;
    let heightPadding = 60;
    if (checks) {
      widthPadding = 285;
      heightPadding = 60;
    }

    return {
      width: width + widthPadding,
      height: height + heightPadding,
    };
  }, [checks, layout]);

  const launchTracker = useCallback(() => {
    let url = `${baseURL}/tracker`;
    if (checks) url = `${baseURL}/tracker/checks`;

    const { width, height } = layoutSize;

    window.open(
      url,
      "HashFrog Tracker",
      `toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=${width},height=${height}`,
    );
  }, [checks, layoutSize]);

  return (
    <Fragment>
      <div className="row">
        <div className="col">
          <h3>Layout Configuration</h3>
          <button type="button" className="btn btn-light btn-sm mb-2" onClick={launchTracker}>
            Launch tracker
          </button>
          <div className="mb-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="checks"
                name="checks"
                value={checks}
                onChange={() => setChecks(prev => !prev)}
              />
              <label htmlFor="checks" className="form-check-label">
                Use check tracking *
              </label>
            </div>
          </div>
          <LayoutSelector />
        </div>
      </div>
      <div className="row">
        <div className="col">
          <h3>Notes</h3>
          <p>
            * Check tracking requires a compatible layout configuration to work properly. It is based on glitchless
            logic and common enabled tricks.
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
    </Fragment>
  );
};

export default TrackerLauncher;
