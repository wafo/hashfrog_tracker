import { useEffect } from "react";
import { Fragment, useCallback, useMemo, useState } from "react";
import LayoutSelector from "../components/LayoutSelector";
import { useLayout } from "../context/layoutContext";
import { useSettingsString } from "../context/trackerContext";
import useDebounce from "../hooks/useDebounce";
import SettingStringsJSON from "../data/setting-strings.json";

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

  const {
    setString: setSettingsStringCache,
    settings_string: cachedSettingsString,
    setVersion: setGeneratorVersionCache,
    generator_version: cachedGeneratorVersion,
  } = useSettingsString();

  const [settingsString, setSettingsString] = useState(() => cachedSettingsString || "");
  const debouncedString = useDebounce(settingsString, 300);

  useEffect(() => {
    setSettingsStringCache(debouncedString);
  }, [debouncedString, setSettingsStringCache]);

  const [generatorVersion, setGeneratorVersion] = useState(() => cachedGeneratorVersion || "");
  const debouncedVersion = useDebounce(generatorVersion, 300);

  useEffect(() => {
    setGeneratorVersionCache(debouncedVersion);
  }, [debouncedVersion, setGeneratorVersionCache]);

  const updateString = preset => {
    setSettingsString(SettingStringsJSON[preset]);
    setGeneratorVersion("dev_6.9.1"); // hardcoded to latest version
  };

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
          <div className="row m-0 w-75">
            <div className="col-4 ps-0">
              <label htmlFor="layout-selector" className="form-label">
                Generator version
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="generator_version"
                name="generator_version"
                placeholder="Generator version" // League S3
                value={generatorVersion}
                onChange={({ target: { value } }) => setGeneratorVersion(value)}
                disabled={!checks}
              />
            </div>
            <div className="col-8 pe-0">
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
          </div>
          <div className="mb-3">
            <label htmlFor="layout-selector" className="form-label w-100">
              Common Presets
            </label>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("league_s3")}
              disabled={!checks}
            >
              League S3
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("scrubs_s4")}
              disabled={!checks}
            >
              Scrubs S4
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("tournament_s6")}
              disabled={!checks}
            >
              Tournament S6
            </button>
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
