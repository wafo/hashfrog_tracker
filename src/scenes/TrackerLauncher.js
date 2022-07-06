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
      <button type="button" onClick={launchTracker}>
        Launch tracker
      </button>
      <div style={{ margin: "0.5rem 0" }}>
        <h3>Layout Configuration</h3>
        <div style={{ marginBottom: "1rem" }}>
          <input type="checkbox" id="checks" name="checks" value={checks} onChange={() => setChecks(prev => !prev)} />
          <label htmlFor="checks" style={{ marginLeft: "0.5rem" }}>
            Use check tracking *
          </label>
        </div>
        <LayoutSelector />
      </div>
      <h3>Notes</h3>
      <p>* Check tracking is based on glitchless logic and common enabled tricks.</p>
      <ul>
        <li>Hidden Grottos without Stone of Agony</li>
        <li>Man on Roof without Hookshot</li>
        <li>Windmill PoH as Adult with Nothing</li>
        <li>Craters Bean PoH with Hover Boots</li>
        <li>Ignoring age requirements</li>
      </ul>
    </Fragment>
  );
};

export default TrackerLauncher;
