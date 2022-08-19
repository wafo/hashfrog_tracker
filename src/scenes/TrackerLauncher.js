import { useEffect } from "react";
import { Fragment, useCallback, useMemo, useState } from "react";
import LayoutSelector from "../components/LayoutSelector";
import { useLayout } from "../context/layoutContext";
import { useSettingsString } from "../context/trackerContext";
import useDebounce from "../hooks/useDebounce";

const baseURL = process.env.PUBLIC_URL;

const TrackerLauncher = () => {
  const [checks, setChecks] = useState(false);
  const { state: layout } = useLayout();

  const layoutSize = useMemo(() => {
    const {
      layoutConfig: { width, height },
    } = layout;

    // Default padding to layouts
    let widthPadding = 0;
    let heightPadding = 25;
    if (checks) {
      widthPadding = 285;
      heightPadding = 25;
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

  const { setString: setSettingsStringCache, settings_string: cachedSettingsString } = useSettingsString();
  const [settingsString, setSettingsString] = useState(() => cachedSettingsString || "");
  const debouncedString = useDebounce(settingsString, 300);

  useEffect(() => {
    setSettingsStringCache(debouncedString);
  }, [debouncedString, setSettingsStringCache]);

  return (
    <Fragment>
      <div className="row">
        <div className="col">
          <h3>Layout Configuration</h3>
          <button type="button" className="btn btn-light btn-sm mb-3" onClick={launchTracker}>
            Launch tracker
          </button>
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
          <div className="mb-3">
            <label htmlFor="layout-selector" className="form-label">
              Settings String
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              id="setting_string"
              name="setting_string"
              placeholder="Settings String same as the generator" // League S3
              value={settingsString}
              onChange={({ target: { value } }) => setSettingsString(value)}
              disabled={!checks}
            />
          </div>

          <LayoutSelector />
        </div>
      </div>
      <div className="row">
        <div className="col">
          <h3>Notes</h3>
          <p>* Check tracking requires a compatible layout configuration to work properly.</p>
          <ul style={{ fontSize: "0.8em" }}>
            <li>The logic assumes you can access both ages, so checks against starting age default to true.</li>
            <li>Closed Deku and Closed Door of Time do not work for the same reason.</li>
            <li>The logic assumes vanilla spawns.</li>
            <li>The logic assumes that the player can let the time of day pass.</li>
            <li>MQ does not work, as the tracker has no option to specify that a dungeon is MQ.</li>
            <li>Trading sequences are not fully implemented but should work well enough.</li>
            <li>Region shortcuts are not implemented.</li>
            <li>
              The settings string parser assumes it is generated using v6.2.181 of the dev randomizer, or a settings
              string that would otherwise be compatible with this version.
            </li>
            <li>
              Counters are not hooked up. For items such as dungeon small keys, the logic assumes you have the maximum
              amount, or 50, in the case of Gold Skulltula Tokens.
            </li>
          </ul>
        </div>
      </div>
    </Fragment>
  );
};

export default TrackerLauncher;
