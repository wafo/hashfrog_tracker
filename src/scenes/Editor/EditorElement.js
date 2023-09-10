import { Fragment, useCallback, useState } from "react";

import iconsJSON from "../../data/icons.json";
import labelsJSON from "../../data/labels.json";
import { splitNameBase64 } from "../../utils/utils";

const toNumber = [
  "size_width",
  "size_height",
  "counterMin",
  "counterMax",
  "selectedStartingIndex",
  "labelStartingIndex",
];

const EditorElement = ({ element, setElement }) => {
  const [labelType, setLabelType] = useState(0);

  const [icon, setIcon] = useState("");
  const [draggedIcon, setDraggedIcon] = useState(null);
  const [iconKey, setIconKey] = useState(Math.random());

  const handleChange = useCallback(
    event => {
      let { value } = event.target;
      const { name } = event.target;
      if (toNumber.includes(name)) value = parseInt(value, 10);

      switch (name) {
        // Size specific
        case "size_width":
        case "size_height": {
          setElement(prev => {
            return {
              ...prev,
              size: name === "size_width" ? [value, prev.size[1]] : [prev.size[0], value],
            };
          });
          break;
        }
        // Counter
        case "counterMin":
        case "counterMax": {
          setElement(prev => ({
            ...prev,
            countConfig: name === "counterMin" ? [value, prev.countConfig[1]] : [prev.countConfig[0], value],
          }));
          break;
        }
        // Checkbox
        case "dragCurrent":
        case "receiver":
        case "hidden": {
          setElement(prev => ({
            ...prev,
            [name]: !prev[name],
          }));
          break;
        }
        // Name
        case "displayName": {
          setElement(prev => ({
            ...prev,
            displayName: value,
            name: value.toLowerCase().replace(/ /g, "_"),
          }));
          break;
        }
        // Label
        case "label": {
          if (labelType === 0) {
            setElement(prev => ({
              ...prev,
              label: labelsJSON[value],
            }));
          } else if (labelType === 1) {
            setElement(prev => ({
              ...prev,
              label: value.split(","),
            }));
          }
          break;
        }
        // General
        default: {
          setElement(prev => ({
            ...prev,
            [name]: value,
          }));
          break;
        }
      }
    },
    [setElement, labelType],
  );

  const addToIcons = () => {
    setElement(prev => ({
      ...prev,
      icons: [...prev.icons, icon],
    }));
  };

  const removeFromIcons = (e, icon) => {
    e.preventDefault();
    setElement(prev => ({
      ...prev,
      icons: [...prev.icons.filter(x => x !== icon)],
    }));
  };

  const onDragStart = (event, icon) => {
    setDraggedIcon(icon);
    event.dataTransfer.effectAllowed = "move";
    // event.dataTransfer.setDragImage(event.target, 50, 50);
  };

  const onDragEnd = () => {
    setDraggedIcon(null);
  };

  const onDragOver = useCallback(
    index => {
      const draggedOverIcon = element.icons[index];
      // Ignore if dragged over itself
      if (draggedOverIcon === draggedIcon) return;
      // filter out the currently dragged item
      // add the dragged item after the dragged over item
      setElement(prev => {
        let icons = [...prev.icons.filter(icon => icon !== draggedIcon)];
        icons.splice(index, 0, draggedIcon);
        return {
          ...prev,
          icons,
        };
      });
    },
    [draggedIcon, element?.icons, setElement],
  );

  const onIconImport = event => {
    const {
      target: { files },
    } = event;

    if (files.length > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setElement(prev => ({
          ...prev,
          icons: [...prev.icons, files[0].name + ";" + reader.result],
        }));
        setIconKey(Math.random());
      };
      reader.readAsDataURL(files[0]);
    }
  };

  return (
    <Fragment>
      <p className="uuid">Element Id: {element.id}</p>
      <div className="mb-2">
        <label htmlFor="name" className="form-label">
          Element Name
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          className="form-control form-control-sm"
          placeholder="Element Name"
          value={element.displayName}
          onChange={handleChange}
        />
      </div>
      <div className="mb-2">
        <label htmlFor="" className="form-label">
          Element Type
        </label>
        <select
          className="form-select form-select-sm"
          id="type"
          name="type"
          value={element.type}
          onChange={handleChange}
        >
          <option value="" disabled>
            Select type
          </option>
          <option value="simple">Simple Element</option>
          <option value="counter">Counter Elements</option>
          <option value="label">Label Element</option>
          <option value="nested">Nested Element</option>
        </select>
      </div>
      <div className="mb-2">
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
            value={element.size[0]}
            onChange={handleChange}
          />
          <span className="input-group-text">X</span>
          <input
            type="number"
            id="size_height"
            name="size_height"
            className="form-control"
            placeholder="Element Height"
            value={element.size[1]}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="mb-2">
        <label htmlFor="counterMin" className="form-label">
          Counter Min/Max
        </label>
        <div className="input-group input-group-sm ">
          <input
            type="number"
            id="counterMin"
            name="counterMin"
            className="form-control"
            placeholder="Counter Min"
            value={element.countConfig[0]}
            onChange={handleChange}
          />
          <span className="input-group-text">To</span>
          <input
            type="number"
            id="counterMax"
            name="counterMax"
            className="form-control"
            placeholder="Counter Max"
            value={element.countConfig[1]}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6 mb-2">
          <label htmlFor="" className="form-label">
            Label Type
          </label>
          <select
            className="form-select form-select-sm"
            id="label_type"
            name="label_type"
            value={labelType}
            onChange={({ target: { value } }) => setLabelType(parseInt(value, 10))}
          >
            <option value="" disabled>
              Select type
            </option>
            <option value="0">From List</option>
            <option value="1">Custom</option>
          </select>
        </div>
        <div className="col-6 mb-2">
          <label htmlFor="width" className="form-label">
            Label Starting Index
          </label>
          <input
            type="number"
            id="labelStartingIndex"
            name="labelStartingIndex"
            className="form-control form-control-sm"
            placeholder="Label Starting Index"
            value={element.labelStartingIndex}
            onChange={handleChange}
            min={0}
            max={element?.label?.length - 1 || 0}
            disabled={element?.type !== "label" || !Array.isArray(element?.label)}
          />
        </div>
      </div>
      {labelType === 0 && (
        <div className="mb-2">
          <label htmlFor="label" className="form-label">
            Label Pool
          </label>
          <select
            className="form-select form-select-sm"
            id="label"
            name="label"
            value={element.label}
            onChange={handleChange}
          >
            <option value="" disabled>
              Select pool
            </option>
            {Object.keys(labelsJSON).map(key => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      )}
      {labelType === 1 && (
        <div className="mb-2">
          <label htmlFor="label" className="form-label">
            Label Pool (Comma Separated)
          </label>
          <input
            type="text"
            id="label"
            name="label"
            className="form-control form-control-sm"
            placeholder="Label Pool"
            value={element.label}
            onChange={handleChange}
          />
        </div>
      )}

      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="receiver"
          name="receiver"
          checked={element.receiver}
          value={element.receiver}
          onChange={handleChange}
        />
        <label htmlFor="receiver" className="form-check-label">
          Receiver (able to drag into it)
        </label>
      </div>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="dragCurrent"
          name="dragCurrent"
          checked={element.dragCurrent}
          value={element.dragCurrent}
          onChange={handleChange}
        />
        <label htmlFor="dragCurrent" className="form-check-label">
          Drag currently selected
        </label>
      </div>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="hidden"
          name="hidden"
          checked={element.hidden}
          value={element.hidden}
          onChange={handleChange}
        />
        <label htmlFor="hidden" className="form-check-label">
          Hide Element
        </label>
      </div>

      <div className="mb-2">
        <label htmlFor="icon" className="form-label">
          Add Icons to Element
        </label>
        <div className="input-group input-group-sm">
          <label htmlFor="icon_file" className="btn btn-light btn-sm">
            Import
          </label>
          <input
            key={iconKey}
            type="file"
            id="icon_file"
            onChange={onIconImport}
            style={{ display: "none" }}
            accept=".jpg, .jpeg, .png"
          />
          <select
            className="form-select"
            id="icon"
            name="icon"
            value={icon}
            onChange={({ target: { value } }) => setIcon(value)}
          >
            <option value="" disabled>
              Select icon
            </option>
            {iconsJSON.map(element => (
              <option key={element} value={element}>
                {element}
              </option>
            ))}
          </select>
          <button className="btn btn-light btn-sm" type="button" onClick={addToIcons}>
            Add
          </button>
        </div>
        <p className="uuid">Recommended to use small PNG images.</p>
      </div>
      {element.icons.length > 0 && (
        <Fragment>
          <p style={{ fontSize: "0.75em", margin: 0, opacity: 0.5 }}>Right click to remove. Drag to re-order.</p>
          <ul className="list-unstyled table-list">
            {element.icons.map((icon, index) => (
              <li
                key={index}
                onContextMenu={e => removeFromIcons(e, icon)}
                onDragStart={e => onDragStart(e, icon)}
                onDragEnd={onDragEnd}
                onDragOver={() => onDragOver(index)}
                draggable
              >
                {splitNameBase64(icon).name}
              </li>
            ))}
          </ul>
        </Fragment>
      )}
    </Fragment>
  );
};

export default EditorElement;
