import styles from "./Editor.module.css";
import elementsJSON from "../../data/elements.json";
import labelsJSON from "../../data/labels.json";
import { Fragment, useCallback, useEffect, useState } from "react";

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
        case "sometimeshint":
          setComponent({
            id: component.id,
            type: "sometimeshint",
            elementId: "4c1b24c3e3954038b14f4daa3656e0b5",
            position: component.position,
            labels: "sometimes",
            width: 150,
          });
          break;
        case "locationhint":
          setComponent({
            id: component.id,
            type: "locationhint",
            elementId: "4c1b24c3e3954038b14f4daa3656e0b5",
            position: component.position,
            labels: "locations",
            width: 250,
            color: "#fff",
            backgroundColor: "#4a8ab6",
            showBoss: true,
            showItems: true,
          });
          break;
        case "table":
          setComponent({
            id: component.id,
            type: "table",
            position: component.position,
            columns: 3,
            padding: "2px",
            elements: [],
            elementsSize: [25, 25],
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

      const toNumber = ["coordX", "coordY", "size_width", "size_height", "width", "columns"];
      if (toNumber.includes(name)) value = parseInt(value, 10);

      switch (name) {
        // Coords specific
        case "coordX":
        case "coordY":
          setComponent(prev => ({
            ...prev,
            position: name === "coordX" ? [value, prev.position[1]] : [prev.position[0], value],
          }));
          break;
        // Size specific
        case "size_width":
        case "size_height": {
          setComponent(prev => {
            let property = "";
            if (prev.type === "element") property = "size";
            if (prev.type === "table") property = "elementsSize";
            let propertyValue = prev[property];
            return {
              ...prev,
              [property]: name === "size_width" ? [value, propertyValue[1]] : [propertyValue[0], value],
            };
          });
          break;
        }
        // Checkbox
        case "showBoss":
        case "showItems":
          setComponent(prev => ({
            ...prev,
            [name]: !prev[name],
          }));
          break;
        // General
        default:
          setComponent(prev => ({
            ...prev,
            [name]: value,
          }));
          break;
      }
    },
    [setComponent],
  );

  return (
    <div className={styles.editorComponent}>
      <p className={styles.displayId}>Component Id: {component.id}</p>
      <div>
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
        </div>
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
        {type === "element" && <ElementEditor component={component} handleChange={handleChange} />}
        {type === "table" && <TableEditor component={component} handleChange={handleChange} />}
        {type === "sometimeshint" && <SometimeshintEditor component={component} handleChange={handleChange} />}
        {type === "locationhint" && <LocationhintEditor component={component} handleChange={handleChange} />}
      </div>
    </div>
  );
};

const ElementEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div>
        <select name="elementId" id="elementId" value={component.elementId} onChange={handleChange}>
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <input
          type="number"
          id="size_width"
          name="size_width"
          placeholder="Element Width"
          style={{ width: 100 }}
          value={component.size[0]}
          onChange={handleChange}
        />
        <span>x</span>
        <input
          type="number"
          id="size_height"
          name="size_height"
          placeholder="Element height"
          style={{ width: 100 }}
          value={component.size[1]}
          onChange={handleChange}
        />
      </div>
    </Fragment>
  );
};

const TableEditor = ({ component, handleChange }) => {
  const [elements, setElements] = useState([...component.elements]);
  const [element, setElement] = useState("a081121b16f84366bf16e16ca90cd23f");
  const [draggedElement, setDraggedElement] = useState(null);

  const handleElementChange = event => {
    const { value } = event.target;
    setElement(value);
  };

  useEffect(() => {
    handleChange({
      target: {
        name: "elements",
        value: elements,
      },
    });
  }, [elements, handleChange]);

  const addToTable = () => {
    setElements(prev => [...prev, element]);
    setElement("a081121b16f84366bf16e16ca90cd23f");
  };

  const removeFromTable = (e, element) => {
    e.preventDefault();
    setElements(prev => [...prev.filter(x => x !== element)]);
  };

  const onDragStart = (event, element) => {
    setDraggedElement(element);
    event.dataTransfer.effectAllowed = "move";
    // event.dataTransfer.setDragImage(event.target, 50, 50);
  };

  const onDragEnd = () => {
    setDraggedElement(null);
  };

  const onDragOver = useCallback(
    index => {
      const draggedOverElement = elements[index];
      // Ignore if dragged over itself
      if (draggedOverElement === draggedElement) return;
      // filter out the currently dragged item
      // add the dragged item after the dragged over item
      setElements(prev => {
        let elements = [...prev.filter(element => element !== draggedElement)];
        elements.splice(index, 0, draggedElement);
        return elements;
      });
    },
    [draggedElement, elements],
  );

  return (
    <Fragment>
      <div>
        <input
          type="number"
          id="columns"
          name="columns"
          placeholder="Number of Columns"
          style={{ width: 100, marginRight: "0.5rem" }}
          value={component.columns}
          onChange={handleChange}
          min={1}
        />
        <input
          type="text"
          id="padding"
          name="padding"
          placeholder="Padding for items"
          style={{ width: 100 }}
          value={component.padding}
          onChange={handleChange}
        />
      </div>
      <div>
        <input
          type="number"
          id="size_width"
          name="size_width"
          placeholder="Element Width"
          style={{ width: 100 }}
          value={component.elementsSize[0]}
          onChange={handleChange}
        />
        <span>x</span>
        <input
          type="number"
          id="size_height"
          name="size_height"
          placeholder="Element height"
          style={{ width: 100 }}
          value={component.elementsSize[1]}
          onChange={handleChange}
        />
      </div>
      <div>
        <select name="elementId" id="elementId" value={element} onChange={handleElementChange}>
          {elementsJSON.map(element => (
            <option key={element.id} value={element.name}>
              {element.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addToTable} style={{ marginLeft: "0.5rem" }}>
          Add
        </button>
      </div>
      {elements.length > 0 && <p style={{ fontSize: "0.75em", margin: 0, opacity: 0.5 }}>Right click to remove. Drag to re-order.</p>}
      <ol>
        {elements.map((element, index) => (
          <li
            key={`${index}-${element}`}
            onContextMenu={e => removeFromTable(e, element)}
            onDragStart={e => onDragStart(e, element)}
            onDragEnd={onDragEnd}
            onDragOver={() => onDragOver(index)}
            draggable
          >
            {element}
          </li>
        ))}
      </ol>
    </Fragment>
  );
};

const SometimeshintEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div>
        <select name="elementId" id="elementId" value={component.elementId} onChange={handleChange}>
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select name="labels" id="labels" value={component.labels} onChange={handleChange}>
          {Object.keys(labelsJSON).map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div>
        <input
          type="number"
          id="width"
          name="width"
          placeholder="Element Width"
          style={{ width: 100 }}
          value={component.width}
          onChange={handleChange}
        />
      </div>
    </Fragment>
  );
};

const LocationhintEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div>
        <select name="elementId" id="elementId" value={component.elementId} onChange={handleChange}>
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select name="labels" id="labels" value={component.labels} onChange={handleChange}>
          {Object.keys(labelsJSON).map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div>
        <input
          type="number"
          id="width"
          name="width"
          placeholder="Element Width"
          style={{ width: 100 }}
          value={component.width}
          onChange={handleChange}
        />
      </div>
      <div>
        <input
          type="text"
          id="color"
          name="color"
          placeholder="Font color"
          style={{ width: 100, marginRight: "0.5rem" }}
          value={component.color}
          onChange={handleChange}
        />
        <input
          type="text"
          id="backgroundColor"
          name="backgroundColor"
          placeholder="Background Color"
          style={{ width: 100 }}
          value={component.backgroundColor}
          onChange={handleChange}
        />
      </div>
      <div>
        <input
          type="checkbox"
          id="showBoss"
          name="showBoss"
          checked={component.showBoss}
          value={component.showBoss}
          onChange={handleChange}
        />
        <label htmlFor="showBoss" style={{ marginLeft: "0.5rem" }}>
          Show Boss
        </label>
      </div>
      <div>
        <input
          type="checkbox"
          id="showItems"
          name="showItems"
          checked={component.showItems}
          value={component.showItems}
          onChange={handleChange}
        />
        <label htmlFor="showItems" style={{ marginLeft: "0.5rem" }}>
          Show Items
        </label>
      </div>
    </Fragment>
  );
};

export default EditorComponent;
