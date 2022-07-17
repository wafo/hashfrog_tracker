import { useMemo, useState, useEffect } from "react";
import { useCheck, useChecks } from "../context/trackerContext";

const Checks = () => {
  const { checks, locations } = useChecks();
  const [type, setType] = useState("overworld");
  const [selected, setSelected] = useState(null);

  const counter = useMemo(() => {
    const counter = {
      locked: 0,
      checked: 0,
      available: 0,
      remaining: 0,
    };

    checks.forEach(check => {
      if (check.available && !check.checked) counter.available += 1;
      if (!check.available) counter.locked += 1;
      if (check.checked) counter.checked += 1;
      if (!check.checked) counter.remaining += 1;
    });

    return counter;
  }, [checks]);

  const handleLocationClick = id => {
    setSelected(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    setSelected(null);
  }, [type]);

  const locationsByType = useMemo(() => {
    const checksByLocation = checks.reduce((acc, check) => {
      if (!acc[check.location_id]) acc[check.location_id] = [];
      acc[check.location_id].push({ ...check });
      return acc;
    }, {});

    let locationsByType = locations.filter(x => x.type === type);

    return locationsByType.reduce((acc, loc) => {
      loc.checks = checksByLocation[loc.id];
      loc.available = 0;
      loc.locked = 0;
      loc.checked = 0;

      loc.checks.forEach(check => {
        if (check.available && !check.checked) loc.available += 1;
        if (!check.available) loc.locked += 1;
        if (check.checked) loc.checked += 1;
      });

      acc.push({ ...loc });
      return acc;
    }, []);
  }, [checks, locations, type]);

  const location = useMemo(() => {
    if (!selected) return null;
    const location = locationsByType.find(x => x.id === selected);
    return location;
  }, [locationsByType, selected]);

  return (
    <div id="checks" className="check-tracker">
      <Buttons type={type} setType={setType} />
      {location && <Location location={location} setSelected={setSelected} />}
      {!location && (
        <div className="check-tracker-locations">
          {locationsByType.map(loc => {
            const style = {};
            if ((loc.available === 0 && loc.locked === 0) || loc.checked >= loc.checks.length) {
              style.opacity = "0.75";
            } else {
              if ((loc.locked < 1 && loc.available > 0) || loc.available + loc.checked >= loc.checks.length) {
                style.borderLeftColor = "#198754";
              } else if (loc.locked > 0 && loc.available > 0) {
                style.borderLeftColor = "#ffc107";
              } else if (loc.locked > 0 && loc.available < 1) {
                style.borderLeftColor = "#dc3545";
              }
            }
            return (
              <div key={loc.id} className="item">
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  onClick={() => handleLocationClick(loc.id)}
                  onContextMenu={e => e.preventDefault()}
                  style={style}
                >
                  <span>{loc.short_label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Info counter={counter} />
    </div>
  );
};

const Buttons = ({ setType }) => {
  return (
    <div className="buttons mb-2">
      <button type="button" className="btn btn-dark btn-sm me-1" onClick={() => setType("overworld")}>
        Overworld
      </button>
      <button type="button" className="btn btn-dark btn-sm" onClick={() => setType("dungeon")} disabled>
        Dungeons
      </button>
    </div>
  );
};

const Location = ({ location, setSelected }) => {
  const [actions] = useCheck();

  return (
    <div className="check-tracker-location">
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2" onClick={() => setSelected(null)}>
        Back
      </button>
      <ul className="check-list">
        {location.checks.map(check => {
          const style = {};
          if (check.checked) style.textDecoration = "line-through";
          if (!check.available) style.opacity = "0.5";

          return (
            <li key={check.id} className="check">
              <button
                type="button"
                style={style}
                onClick={() => actions.markCheck(check.id)}
                onContextMenu={e => {
                  e.preventDefault();
                  actions.markCheck(check.id);
                }}
              >
                {check.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Info = ({ counter }) => {
  return (
    <div className="info">
      <table>
        <tbody>
          <tr>
            <td>{counter.checked}</td>
            <td>Checked</td>
          </tr>
          <tr>
            <td>{counter.available}</td>
            <td>Available</td>
          </tr>
          <tr>
            <td>{counter.remaining}</td>
            <td>Remaining</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Checks;
