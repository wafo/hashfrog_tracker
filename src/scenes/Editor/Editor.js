import { Fragment, useCallback, useState } from "react";
import Layout from "../Layout/Layout";
import EditorLayoutConfig from "./EditorLayoutConfig";
import EditorComponentsList from "./EditorComponentsList";
import styles from "./Editor.module.css";
import { generateId, readFileAsText } from "../../utils/utils";
import FileSaver from "file-saver";

const baseLayout = {
  id: "",
  layoutConfig: {
    name: "",
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

  const [layoutKey, setLayoutKey] = useState(Math.random());

  const handleLayoutOpen = async event => {
    const {
      target: { files },
    } = event;

    if (files.length > 0) {
      const content = await readFileAsText(files[0]);
      const parsedLayout = JSON.parse(content);
      setLayout(parsedLayout);
      setLayoutKey(Math.random());
    }
  };

  const handleLayoutSave = useCallback(() => {
    //pass data from localStorage API to blob
    const jsonBlob = new Blob([JSON.stringify(layout)], { type: "text/plain" });
    FileSaver.saveAs(jsonBlob, `${layout.layoutConfig.name.replace(/ /g, "_")}.json`);
  }, [layout]);

  return (
    <div className="container" style={{ padding: "1rem 0" }}>
      {layout.id && <Layout layout={layout} hideFooter />}
      {!layout.id && <p className={styles.noLayout}>Initialize a layer first.</p>}
      <div className={styles.editor}>
        <div className={styles.buttonRow}>
          <button type="button" onClick={initializeNewLayout}>
            New
          </button>
          <div>
            <label htmlFor="open">Open</label>
            <input
              key={layoutKey}
              type="file"
              id="open"
              onChange={handleLayoutOpen}
              style={{ display: "none" }}
              accept=".json"
            />
          </div>
          <button type="button" onClick={handleLayoutSave}>
            Export Layout
          </button>
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
