'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import LayoutSelector from "../components/LayoutSelector";
import { useLayout } from "../context/layoutContext";
import { useSettingsString } from "../context/trackerContext";
import SettingStringsJSON from "../data/setting-strings.json";
import useDebounce from "../hooks/useDebounce";

const baseURL = "";
const GENERATOR_VERSION = process.env.NEXT_PUBLIC_GENERATOR_VERSION;

const PRESETS = SettingStringsJSON.presets || [];
const CURRENT_ACTIVE_VERSION = SettingStringsJSON.currentActiveVersion || "9.0.0";
const GENERATOR_VERSIONS = SettingStringsJSON.supportedVersions || ["9.0.0"];

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
    if (checks) { url = `${baseURL}/tracker/checks`; }

    const { width, height } = layoutSize;

    window.open(
      url,
      "HashFrog Tracker",
      `toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=${width},height=${height}`
    );
  }, [checks, layoutSize]);

  const {
    setString: setSettingsStringCache,
    settings_string: cachedSettingsString,
    setVersion: setGeneratorVersionCache,
    generator_version: cachedGeneratorVersion,
  } = useSettingsString();

  const [settingsString, setSettingsString] = useState(
    () => cachedSettingsString || ""
  );
  const debouncedString = useDebounce(settingsString, 300);

  useEffect(() => {
    setSettingsStringCache(checks ? debouncedString : "");
  }, [checks, debouncedString, setSettingsStringCache]);

  const [generatorVersion, setGeneratorVersion] = useState(
    () => cachedGeneratorVersion || CURRENT_ACTIVE_VERSION
  );
  const [isCustomVersion, setIsCustomVersion] = useState(
    () => {
      const version = cachedGeneratorVersion || CURRENT_ACTIVE_VERSION;
      return version && !GENERATOR_VERSIONS.includes(version);
    }
  );
  const debouncedVersion = useDebounce(generatorVersion, 300);

  // Auto-detect if version is custom when it changes
  useEffect(() => {
    if (generatorVersion) {
      setIsCustomVersion(!GENERATOR_VERSIONS.includes(generatorVersion));
    }
  }, [generatorVersion]);

  useEffect(() => {
    setGeneratorVersionCache(debouncedVersion);
  }, [debouncedVersion, setGeneratorVersionCache]);

  const updateString = (preset) => {

    if (preset.settingsString) {
      setSettingsString(preset.settingsString);
    } else {
      // This should never happen. if it does, a preset has no settingString.
      setSettingsString("UNKNOWN_SETTINGS_STRING");
    }

    // Use the mapped generator version. If not, use .env, if not, use the current active hardcoded version. (9.0.0 as of 1/25/2026)
    if (preset.generatorVersion) {
      setGeneratorVersion(preset.generatorVersion);
    } else if (GENERATOR_VERSION) {
      setGeneratorVersion(GENERATOR_VERSION);
    } else {
      setGeneratorVersion(CURRENT_ACTIVE_VERSION);
    }
  };

  // Check if current settings match any preset
  const activePreset = useMemo(() => {
    return PRESETS.find(
      (preset) => preset.settingsString === settingsString
    );
  }, [settingsString]);

  return (
    <Fragment>
      {/* Main Launcher Card */}
      <Card className="bg-dark border-secondary text-white mb-4">
        <Card.Body>
          <h5
            className="card-title text-uppercase fw-bold text-white mb-4"
            style={{ letterSpacing: "0.05em" }}
          >
            Tracker Settings
          </h5>

          <div className="d-grid mb-4">
            <Button
              type="button"
              variant="success"
              size="lg"
              onClick={launchTracker}
              className="fw-semibold"
            >
              🚀 Launch Tracker
            </Button>
          </div>

          <Form.Check
            type="switch"
            id="checks"
            label="Enable check tracking"
            checked={checks}
            onChange={() => setChecks((prev) => !prev)}
            className="mb-3 text-light"
          />

          {checks && (
            <div className="border-top border-secondary pt-3 mt-3">
              <p className="small text-secondary mb-2">
                Configure logic settings for check tracking
              </p>
              {activePreset ? (
                <p className="mb-3">
                  <span className="badge bg-success d-inline-flex align-items-center gap-1">
                    ⭐ Using {activePreset.label} Preset
                  </span>
                </p>
              ) : settingsString && (
                <p className="mb-3">
                  <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                    ⚙️ Using Custom Settings String
                  </span>
                </p>
              )}

              <div className="row g-3 mb-3">
                <div className="col-4">
                  <Form.Label
                    htmlFor="generator_version"
                    className="text-secondary"
                  >
                    Generator Version
                  </Form.Label>
                  {isCustomVersion ? (
                    <InputGroup size="sm">
                      <Form.Control
                        type="text"
                        id="generator_version"
                        name="generator_version"
                        placeholder="Enter custom version"
                        value={generatorVersion}
                        onChange={({ target: { value } }) =>
                          setGeneratorVersion(value)
                        }
                      />
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setIsCustomVersion(false);
                          setGeneratorVersion(CURRENT_ACTIVE_VERSION);
                        }}
                      >
                        ×
                      </Button>
                    </InputGroup>
                  ) : (
                    <Form.Select
                      size="sm"
                      id="generator_version"
                      name="generator_version"
                      value={generatorVersion}
                      onChange={({ target: { value } }) => {
                        if (value === "__other__") {
                          setIsCustomVersion(true);
                          setGeneratorVersion("");
                        } else {
                          setGeneratorVersion(value);
                        }
                      }}
                    >
                      <option value="">Select version</option>
                      {GENERATOR_VERSIONS.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                      <option value="__other__">Other...</option>
                    </Form.Select>
                  )}
                </div>
                <div className="col-8">
                  <Form.Label htmlFor="setting_string" className="text-secondary">
                    Settings String
                  </Form.Label>
                  <InputGroup size="sm">
                    <Form.Control
                      type="text"
                      id="setting_string"
                      name="setting_string"
                      placeholder="Paste settings string here"
                      value={settingsString}
                      onChange={({ target: { value } }) =>
                        setSettingsString(value)
                      }
                    />
                  </InputGroup>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Form.Label className="text-secondary mb-0 small">
                  Quick Presets:
                </Form.Label>
                <DropdownButton
                  id="presets-dropdown"
                  title="Select Preset"
                  variant="outline-light"
                  size="sm"
                >
                  {PRESETS.map((preset) => (
                    <Dropdown.Item
                      key={preset.value}
                      onClick={() => updateString(preset)}
                    >
                      {preset.label}
                    </Dropdown.Item>
                  ))}
                </DropdownButton>
              </div>

              <Alert variant="info" className="mt-3 mb-0 py-2 small">
                {" "}To use a different version, select &ldquo;Other...&rdquo; in the Generator Version field and enter a version
                (e.g., <code>7.1.0</code> for releases or <code>dev_9.0.1</code> or <code>devrreal_9.0.2-15</code> for dev branches).
              </Alert>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Layout Configuration Card */}
      <Card className="bg-dark border-secondary text-white mb-4">
        <Card.Body>
          <h5
            className="card-title text-uppercase fw-bold text-white mb-3"
            style={{ letterSpacing: "0.05em" }}
          >
            Layout Configuration
          </h5>
          <LayoutSelector />
        </Card.Body>
      </Card>

      {/* Notes Card */}
      <Card className="bg-dark border-secondary text-white">
        <Card.Body>
          <h6
            className="text-uppercase fw-bold text-white mb-3"
            style={{ letterSpacing: "0.05em" }}
          >
            Notes
          </h6>
          <p className="small text-warning mb-2">
            * Check tracking requires a compatible layout configuration.
          </p>
          <ul className="small text-secondary mb-0 ps-3">
            <li className="mb-1">
              The logic assumes: access to both ages; no shuffled entrances, owl
              drops, warp song destinations, or spawns; and vanilla (default)
              ocarina melodies.
            </li>
            <li className="mb-1">
              Closed Forest and Closed Door of Time do not work for the reasons
              above.
            </li>
            <li>
              The logic assumes that the initial value for a counter is zero.
              Click the counter to update it if not.
            </li>
            <li>
              Advanced logic is not yet supported.
            </li>
          </ul>
        </Card.Body>
      </Card>
    </Fragment>
  );
};

export default TrackerLauncher;
