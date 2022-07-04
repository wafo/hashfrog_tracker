import { Fragment, useState } from "react";
import Layout from "../Layout/Layout";
import { v4 as uuidv4 } from "uuid";
import EditorLayoutConfig from "./EditorLayoutConfig";
import EditorComponentsList from "./EditorComponentsList";
import styles from "./Editor.module.css";

function generateId() {
  return uuidv4().replace(/-/g, "");
}

const baseLayout = {
  id: "",
  name: "",
  layoutConfig: {
    backgroundColor: "#222",
    width: 300,
    height: 500,
    fontFamily: null,
    fontSize: null,
    fontColor: null,
  },
  components: [],
};

const Editor = () => {
  const [layout, setLayout] = useState({ ...baseLayout });

  const setLayoutConfig = value => {
    setLayout(prev => ({ ...prev, layoutConfig: value }));
  };

  const initializeNewLayout = () => {
    setLayout({ ...baseLayout, id: generateId() });
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      {layout.id && <Layout layout={layout} hideFooter />}
      {!layout.id && <p className={styles.noLayout}>Initialize a layer first.</p>}
      <div className={styles.editor}>
        <div className={styles.buttonRow}>
          <button type="button" onClick={initializeNewLayout}>
            New
          </button>
          <div>
            <label htmlFor="open">Open</label>
            <input type="file" id="open" style={{ display: "none" }} />
          </div>
          <button type="button">Export Layout</button>
        </div>
        <p className={styles.displayId}>Layout ID: {layout.id}</p>
        {layout.id && (
          <Fragment>
            <EditorLayoutConfig layoutConfig={layout.layoutConfig} setLayoutConfig={setLayoutConfig} />
            <EditorComponentsList components={layout.components} setLayout={setLayout} />
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default Editor;
