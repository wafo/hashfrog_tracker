import { useMemo, useState } from "react";
import { useCheck, useChecks } from "../../context/trackerContext";
import styles from "./Checks.module.css";

const Checks = () => {
  const { checks, locations, items } = useChecks();
  const [type, setType] = useState("overworld");
  const [selected, setSelected] = useState(null);

  const counter = useMemo(() => {
    const counter = {
      locked: 0,
      checked: 0,
      available: 0,
      remaining: 0,
    };

    checks.forEach((check) => {
      if (check.available) counter.available += 1;
      if (!check.available) counter.locked += 1;
      if (check.checked) counter.checked += 1;
      if (!check.checked) counter.remaining += 1;
    });

    return counter;
  }, [checks]);

  const handleLocationClick = (id) => {
    setSelected((prev) => (prev === id ? null : id));
  };

  const locationsByType = useMemo(() => {
    return locations.filter((x) => x.type === type);
  }, [locations, type]);

  const location = useMemo(() => {
    if (!selected) return null;
    const location = locations.find((x) => x.id === selected);
    location.checks = location.checks.map((check) => {
      if (check.condition) {
        check.available = new Function("return " + check.condition)()(items);
      }
      return check;
    });
    return location;
  }, [selected, locations, items]);

  return (
    <div id="checks" style={{ width: "350px" }}>
      <Buttons type={type} setType={setType} />
      {location && <Location location={location} setSelected={setSelected} />}
      {!location && (
        <div className={styles.locations}>
          {locationsByType.map((loc) => (
            <div key={loc.id} className={styles.locations_item}>
              <button type="button" onClick={() => handleLocationClick(loc.id)}>
                <span>{loc.short_label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* <Info counter={counter} /> */}
    </div>
  );
};

const Buttons = ({ type, setType }) => {
  return (
    <div className={styles.buttons}>
      <button type="button" className="" onClick={() => setType("overworld")}>
        Overworld
      </button>
      <button type="button" className="" onClick={() => setType("dungeon")}>
        Dungeons
      </button>
    </div>
  );
};

const Location = ({ location, setSelected }) => {
  const [actions] = useCheck();

  return (
    <div className={styles.location}>
      <button type="button" onClick={() => setSelected(null)}>
        Back
      </button>
      <ul className={styles.checks}>
        {location.checks.map((check) => (
          <li key={check.id} className={styles.check}>
            <button
              type="button"
              disabled={!check.available}
              style={check.checked ? { textDecoration: "line-through" } : {}}
              onClick={() => actions.markCheck(check.id)}
            >
              {check.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Info = ({ counter }) => {
  return (
    <div className={styles.info}>
      <table>
        <tbody>
          <tr>
            <td>{counter.checked}</td>
            <td>Completed</td>
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
