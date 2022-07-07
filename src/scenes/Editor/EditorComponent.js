import { Fragment, useCallback, useEffect, useState } from "react";
import elementsJSON from "../../data/elements.json";
import labelsJSON from "../../data/labels.json";
import { generateId } from "../../utils/utils";

const EditorComponent = ({ component, setComponent }) => {
  let { position, type, displayName = "" } = component;
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
            color: "#ffffff",
            backgroundColor: "#333333",
            showIcon: true,
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
            color: "#ffffff",
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
        case "showIcon":
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
    <Fragment>
      <p className="uuid">Component Id: {component.id}</p>
      <div className="mb-2">
        <label htmlFor="name" className="form-label">
          Component Name
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          className="form-control form-control-sm"
          placeholder="Component Name"
          value={displayName}
          onChange={handleChange}
        />
      </div>
      <div className="mb-2">
        <label htmlFor="" className="form-label">
          Element Type
        </label>
        <select className="form-select form-select-sm" id="type" name="type" value={type} onChange={handleTypeChange}>
          <option value="" disabled>
            Select type
          </option>
          <option value="element">Individual Element</option>
          <option value="table">Table of Elements</option>
          <option value="sometimeshint">Sometimes Hint</option>
          <option value="locationhint">Location Hint</option>
        </select>
      </div>
      <div className="col mb-2">
        <label htmlFor="width" className="form-label">
          Element Position
        </label>
        <div className="input-group input-group-sm ">
          <input
            type="number"
            id="coordX"
            name="coordX"
            className="form-control"
            placeholder="X Coordinate"
            value={coordX}
            onChange={handleChange}
          />
          <span className="input-group-text">X</span>
          <input
            type="number"
            id="coordY"
            name="coordY"
            className="form-control"
            placeholder="Y Coordinate"
            value={coordY}
            onChange={handleChange}
          />
        </div>
      </div>
      {type === "element" && <ElementEditor component={component} handleChange={handleChange} />}
      {type === "table" && <TableEditor component={component} handleChange={handleChange} />}
      {type === "sometimeshint" && <SometimeshintEditor component={component} handleChange={handleChange} />}
      {type === "locationhint" && <LocationhintEditor component={component} handleChange={handleChange} />}
    </Fragment>
  );
};

const ElementEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div className="mb-2">
        <label htmlFor="" className="form-label">
          Element (Item / Equipment / Others)
        </label>
        <select
          className="form-select form-select-sm"
          id="elementId"
          name="elementId"
          value={component.elementId}
          onChange={handleChange}
        >
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="col mb-2">
        <label htmlFor="width" className="form-label">
          Element Size
        </label>
        <div className="input-group input-group-sm ">
          <input
            type="number"
            id="size_width"
            name="size_width"
            className="form-control"
            placeholder="Element Width"
            value={component.size[0]}
            onChange={handleChange}
          />
          <span className="input-group-text">X</span>
          <input
            type="number"
            id="size_height"
            name="size_height"
            className="form-control"
            placeholder="Element Height"
            value={component.size[1]}
            onChange={handleChange}
          />
        </div>
      </div>
    </Fragment>
  );
};

const TableEditor = ({ component, handleChange }) => {
  const [elements, setElements] = useState([...component.elements.map(x => ({ id: generateId(), value: x }))]);
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
        value: elements.map(x => x.value),
      },
    });
  }, [elements, handleChange]);

  const addToTable = useCallback(() => {
    const newElement = {
      id: generateId(),
      value: element,
    };
    setElements(prev => [...prev, newElement]);
    setElement("a081121b16f84366bf16e16ca90cd23f");
  }, [element]);

  const removeFromTable = (e, element) => {
    e.preventDefault();
    setElements(prev => [...prev.filter(x => x.id !== element.id)]);
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
      if (draggedOverElement.id === draggedElement.id) return;
      // filter out the currently dragged item
      // add the dragged item after the dragged over item
      setElements(prev => {
        let elements = [...prev.filter(element => element.id !== draggedElement.id)];
        elements.splice(index, 0, draggedElement);
        return elements;
      });
    },
    [draggedElement, elements],
  );

  return (
    <Fragment>
      <div className="col mb-2">
        <label htmlFor="width" className="form-label">
          Elements Size
        </label>
        <div className="input-group input-group-sm">
          <input
            type="number"
            id="size_width"
            name="size_width"
            className="form-control"
            placeholder="Element Width"
            value={component.elementsSize[0]}
            onChange={handleChange}
          />
          <span className="input-group-text">X</span>
          <input
            type="number"
            id="size_height"
            name="size_height"
            className="form-control"
            placeholder="Element Height"
            value={component.elementsSize[1]}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="row mb-2">
        <div className="col-6">
          <label htmlFor="padding" className="form-label">
            Elements Padding
          </label>
          <input
            type="text"
            id="padding"
            name="padding"
            className="form-control form-control-sm"
            placeholder="Padding for items"
            value={component.padding}
            onChange={handleChange}
          />
        </div>
        <div className="col-6">
          <label htmlFor="columns" className="form-label">
            Table Columns
          </label>
          <input
            type="number"
            id="columns"
            name="columns"
            className="form-control form-control-sm"
            placeholder="Number of Columns"
            value={component.columns}
            onChange={handleChange}
            min={1}
          />
        </div>
        <div className="col-12">
          <p className="uuid">In CSS Padding format</p>
        </div>
      </div>
      <div className="mb-2">
        <label htmlFor="elementId" className="form-label">
          Add Elements to Table
        </label>
        <div className="input-group input-group-sm">
          <select
            className="form-select"
            id="elementId"
            name="elementId"
            value={element}
            onChange={handleElementChange}
          >
            {elementsJSON.map(element => (
              <option key={element.id} value={element.name}>
                {element.displayName}
              </option>
            ))}
          </select>
          <button className="btn btn-light btn-sm" type="button" onClick={addToTable}>
            Add
          </button>
        </div>
      </div>
      {elements.length > 0 && (
        <p style={{ fontSize: "0.75em", margin: 0, opacity: 0.5 }}>Right click to remove. Drag to re-order.</p>
      )}
      <ul className="list-unstyled table-list">
        {elements.map((element, index) => (
          <li
            key={element.id}
            onContextMenu={e => removeFromTable(e, element)}
            onDragStart={e => onDragStart(e, element)}
            onDragEnd={onDragEnd}
            onDragOver={() => onDragOver(index)}
            draggable
          >
            {element.value}
          </li>
        ))}
      </ul>
    </Fragment>
  );
};

const SometimeshintEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div className="mb-2">
        <label htmlFor="elementId" className="form-label">
          Element (Item / Equipment / Others)
        </label>
        <select
          className="form-select form-select-sm"
          id="elementId"
          name="elementId"
          value={component.elementId}
          onChange={handleChange}
        >
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label htmlFor="labels" className="form-label">
          Label Pool
        </label>
        <select
          className="form-select form-select-sm"
          id="labels"
          name="labels"
          value={component.labels}
          onChange={handleChange}
        >
          {Object.keys(labelsJSON).map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label htmlFor="width" className="form-label">
          Element Width
        </label>
        <input
          type="number"
          id="width"
          name="width"
          className="form-control form-control-sm"
          placeholder="Element Width"
          value={component.width}
          onChange={handleChange}
        />
      </div>
      <div className="row">
        <div className="col-12">
          <label htmlFor="color" className="form-label">
            Text Color & Background Color
          </label>
        </div>
        <div className="col-6 mb-2">
          <input
            type="color"
            className="form-control form-control-sm"
            id="color"
            name="color"
            title="Choose text color"
            value={component.color}
            onChange={handleChange}
          />
        </div>
        <div className="col-6 mb-2">
          <input
            type="color"
            className="form-control form-control-sm"
            id="backgroundColor"
            name="backgroundColor"
            title="Choose background color"
            value={component.backgroundColor}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="showIcon"
          name="showIcon"
          checked={component.showIcon}
          value={component.showIcon}
          onChange={handleChange}
        />
        <label htmlFor="showIcon" className="form-check-label">
          Show Icon
        </label>
      </div>
    </Fragment>
  );
};

const LocationhintEditor = ({ component, handleChange }) => {
  return (
    <Fragment>
      <div className="mb-2">
        <label htmlFor="elementId" className="form-label">
          Element (Item / Equipment / Others)
        </label>
        <select
          className="form-select form-select-sm"
          id="elementId"
          name="elementId"
          value={component.elementId}
          onChange={handleChange}
        >
          {elementsJSON.map(element => (
            <option key={element.id} value={element.id}>
              {element.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label htmlFor="labels" className="form-label">
          Label Pool
        </label>
        <select
          className="form-select form-select-sm"
          id="labels"
          name="labels"
          value={component.labels}
          onChange={handleChange}
        >
          {Object.keys(labelsJSON).map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label htmlFor="width" className="form-label">
          Element Width
        </label>
        <input
          type="number"
          id="width"
          name="width"
          className="form-control form-control-sm"
          placeholder="Element Width"
          value={component.width}
          onChange={handleChange}
        />
      </div>
      <div className="row">
        <div className="col-12">
          <label htmlFor="color" className="form-label">
            Text Color & Background Color
          </label>
        </div>
        <div className="col-6 mb-2">
          <input
            type="color"
            className="form-control form-control-sm"
            id="color"
            name="color"
            title="Choose text color"
            value={component.color}
            onChange={handleChange}
          />
        </div>
        <div className="col-6 mb-2">
          <input
            type="color"
            className="form-control form-control-sm"
            id="backgroundColor"
            name="backgroundColor"
            title="Choose background color"
            value={component.backgroundColor}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="showBoss"
          name="showBoss"
          checked={component.showBoss}
          value={component.showBoss}
          onChange={handleChange}
        />
        <label htmlFor="showBoss" className="form-check-label">
          Show Boss
        </label>
      </div>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="showItems"
          name="showItems"
          checked={component.showItems}
          value={component.showItems}
          onChange={handleChange}
        />
        <label htmlFor="showItems" className="form-check-label">
          Show Items
        </label>
      </div>
    </Fragment>
  );
};

export default EditorComponent;
