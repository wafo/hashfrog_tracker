import { useCallback, useEffect, useMemo, useState } from "react";

import elementsJSON from "../../data/elements.json";
import { generateId, duplicate } from "../../utils/utils";
import EditorComponent from "./EditorComponent";

const EditorComponentsList = ({ components, setLayout, customElements }) => {
  const [component, setComponent] = useState(null);

  const addComponent = () => {
    setComponent(prev => ({
      id: generateId(),
      type: "",
      displayName: prev?.displayName || "",
      position: [0, 0],
    }));
  };

  const deleteComponent = useCallback(() => {
    setLayout(prev => {
      let components = [...prev.components.filter(x => x.id !== component.id)];
      return {
        ...prev,
        components: components,
      };
    });
    setComponent(null);
  }, [component, setLayout]);

  // Any time a component change (coming from EditorComponent)
  // we update layout from EditorLayoutConfig to display the changes in real time
  useEffect(() => {
    if (!component) return;

    setLayout(prev => {
      let components = [...prev.components];
      const index = components.findIndex(x => x.id === component.id);
      if (index !== -1) {
        components[index] = { ...component };
      } else {
        components = [...components, component];
      }
      return {
        ...prev,
        components: components,
      };
    });
  }, [component, setLayout]);

  // From default elements and custom in layout
  const combinedElements = useMemo(() => {
    return [...elementsJSON, ...(customElements || [])];
  }, [customElements]);

  const duplicateComponent = useCallback(() => duplicate(component, components, setComponent), [component, components]);

  return (
    <div className="component-list">
      <h5>Components</h5>
      <div className="btn-row mb-2">
        <button type="button" className="btn btn-light btn-sm" onClick={addComponent} disabled={component}>
          Add
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={deleteComponent} disabled={!component}>
          Delete
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={() => setComponent(null)} disabled={!component}>
          Save
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={duplicateComponent} disabled={!component}>
          Duplicate
        </button>
      </div>
      {component && (
        <EditorComponent component={component} setComponent={setComponent} combinedElements={combinedElements} />
      )}
      {!component && components.length < 1 && <p className="uuid my-2">Add a component to start</p>}
      {!component && components.length > 0 && (
        <ul className="list-unstyled mb-0">
          {!component &&
            components.length > 0 &&
            components.map(component => (
              <li key={component.id}>
                <button type="button" className="btn btn-dark btn-sm" onClick={() => setComponent(component)}>
                  {component.type || "undefined"} - {component.displayName || component.id.substring(0, 12)}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default EditorComponentsList;
