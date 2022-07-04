import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import styles from "./Editor.module.css";
import EditorComponent from "./EditorComponent";

function generateId() {
  return uuidv4().replace(/-/g, "");
}

const EditorComponentsList = ({ components, setLayout }) => {
  const [component, setComponent] = useState(null);

  const addComponent = () => {
    setComponent({
      id: generateId(),
      type: "",
      position: [0, 0],
    });
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

  return (
    <div className={styles.componentsList}>
      <p>Components</p>
      <div className={styles.buttonRow}>
        <button type="button" onClick={addComponent} disabled={component}>
          Add
        </button>
        <button type="button" onClick={deleteComponent} disabled={!component}>
          Delete
        </button>
        <button type="button" onClick={() => setComponent(null)} disabled={!component}>
          Save
        </button>
      </div>
      {component && <EditorComponent component={component} setComponent={setComponent} />}
      <ul>
        {components.length < 1 && <li>...</li>}
        {!component &&
          components.length > 0 &&
          components.map(component => (
            <li key={component.id}>
              <button type="button" onClick={() => setComponent(component)}>
                {component.type} - {component.id}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default EditorComponentsList;
