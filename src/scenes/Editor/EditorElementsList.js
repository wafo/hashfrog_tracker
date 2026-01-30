import { useCallback, useEffect, useMemo, useState } from "react";

import Element from "../../components/Element";
import { duplicate, generateId, isBase64, splitNameBase64 } from "../../utils/utils";
import EditorElement from "./EditorElement";

const baseURL = process.env.PUBLIC_URL;

const EditorElementsList = ({ elements, setLayout }) => {
  const [element, setElement] = useState(null);

  const addElement = () => {
    setElement({
      id: generateId(),
      type: "simple",
      name: "",
      displayName: "",
      label: "",
      labelStartingIndex: 0,
      size: [25, 25],
      icons: ["hash_frog_bw_32x32.png"],
      countConfig: [0, 1],
      receiver: false,
      selectedStartingIndex: 0,
    });
  };

  const deleteElement = useCallback(() => {
    setLayout(prev => {
      const filtered = prev.elements ? [...prev.elements.filter(x => x.id !== element.id)] : [];
      return {
        ...prev,
        elements: filtered,
      };
    });
    setElement(null);
  }, [element, setLayout]);

  const duplicateElements = useCallback(() => duplicate(element, elements, setElement), [element, elements]);

  useEffect(() => {
    if (!element) { return; }
    setLayout(prev => {
      let updated = prev.elements ? [...prev.elements] : [];
      const index = updated.findIndex(x => x.id === element.id);
      if (index !== -1) {
        updated[index] = { ...element };
      } else {
        updated = [...updated, element];
      }
      return {
        ...prev,
        elements: updated,
      };
    });
  }, [element, setLayout]);

  const icons = useMemo(() => {
    return element?.icons.map(icon => {
      if (isBase64(icon)) {
        return splitNameBase64(icon).file;
      }
      return `${baseURL}/icons/${icon}`;
    });
  }, [element?.icons]);

  return (
    <div className="element-list">
      <h5>Custom Elements</h5>
      <div className="btn-row mb-2">
        <button type="button" className="btn btn-light btn-sm" onClick={addElement} disabled={element}>
          Add
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={deleteElement} disabled={!element}>
          Delete
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={() => setElement(null)} disabled={!element}>
          Save
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={duplicateElements} disabled={!element}>
          Duplicate
        </button>
      </div>
      {element && ( // Preview of the element
        <div className="d-flex justify-content-center p-3" style={{ backgroundColor: "#000" }}>
          <Element {...element} hidden={false} icons={icons} />
        </div>
      )}
      {element && <EditorElement element={element} setElement={setElement} />}
      {!element && elements.length < 1 && <p className="uuid my-2">Add a element to start</p>}
      {!element && elements.length > 0 && (
        <ul className="list-unstyled mb-0">
          {!element &&
            elements.length > 0 &&
            elements.map(el => (
              <li key={el.id}>
                <button type="button" className="btn btn-dark btn-sm" onClick={() => setElement(el)}>
                  {el.type || "undefined"} - {el.displayName || el.id.substring(0, 12)}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default EditorElementsList;
