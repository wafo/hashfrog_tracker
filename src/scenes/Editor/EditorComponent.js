import styles from "./Editor.module.css";
import elementsJSON from "../../data/elements.json";
import { Fragment, useCallback } from "react";

const EditorComponent = ({ component, setComponent }) => {
  let { position, type } = component;
  let [coordX, coordY] = position;

  const handleTypeChange = useCallback(
    event => {
      const { value } = event.target;

      switch (value) {
        case "element":
          setComponent({
            id: component.id,
            type: "element",
            elementId: "0c44ac338d7249b39271d0b25425b7d9",
            position: component.position,
            size: [25, 25],
          });
          break;
        default:
          break;
      }
    },
    [component, setComponent],
  );

  const handleChange = useCallback(
    event => {
      let { value } = event.target;
      const { name } = event.target;

      const toNumber = ["coordX", "coordY", "width", "height"];
      if (toNumber.includes(name)) value = parseInt(value, 10);

      switch (name) {
        case "coordX":
        case "coordY":
          setComponent(prev => ({
            ...prev,
            position: name === "coordX" ? [value, prev.position[1]] : [prev.position[0], value],
          }));
          break;
        case "width":
        case "height":
          setComponent(prev => ({
            ...prev,
            size: name === "width" ? [value, prev.size[1]] : [prev.size[0], value],
          }));
          break;
        case "elementId":
          setComponent(prev => ({
            ...prev,
            [name]: value,
          }));
          break;
        default:
          break;
      }
    },
    [setComponent],
  );

  return (
    <div className={styles.editorComponent}>
      <p className={styles.displayId}>Component Id: {component.id}</p>
      <div>
        <select name="type" id="type" value={type} onChange={handleTypeChange}>
          <option value="" disabled>
            Select Type
          </option>
          <option value="element">Element</option>
          <option value="table">Table</option>
          <option value="sometimeshint">Sometimes Hint</option>
          <option value="locationhint">Location Hint</option>
        </select>
        <div>
          <input
            type="number"
            id="coordX"
            name="coordX"
            placeholder="Coord X"
            style={{ width: 100 }}
            value={coordX}
            onChange={handleChange}
          />
          <span>x</span>
          <input
            type="number"
            id="coordY"
            name="coordY"
            placeholder="Coord Y"
            style={{ width: 100 }}
            value={coordY}
            onChange={handleChange}
          />
        </div>
        {/** This could be in a separate component. One for each type */}
        {type === "element" && (
          <Fragment>
            <select name="elementId" id="elementId" value={component.elementId} onChange={handleChange}>
              {elementsJSON.map(element => (
                <option key={element.id} value={element.id}>
                  {element.name}
                </option>
              ))}
            </select>
            <div>
              <input
                type="number"
                id="width"
                name="width"
                placeholder="Element Width"
                style={{ width: 100 }}
                value={component.size[0]}
                onChange={handleChange}
              />
              <span>x</span>
              <input
                type="number"
                id="height"
                name="height"
                placeholder="Element height"
                style={{ width: 100 }}
                value={component.size[1]}
                onChange={handleChange}
              />
            </div>
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default EditorComponent;
