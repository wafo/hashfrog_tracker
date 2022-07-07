import { Fragment, useCallback, useState } from "react";
import Layout from "../Layout";
import EditorLayoutConfig from "./EditorLayoutConfig";
import EditorComponentsList from "./EditorComponentsList";
import { generateId, readFileAsText } from "../../utils/utils";
import FileSaver from "file-saver";

const baseLayout = {
  id: "",
  layoutConfig: {
    name: "",
    backgroundColor: "#000000",
    width: 300,
    height: 500,
    fontFamily: null,
    fontSize: null,
    fontColor: null,
  },
  components: [],
};

function prepareLayout(rawLayout) {
  const cleanedComponents = [
    ...rawLayout.components.map(component => {
      switch (component.type) {
        case "element":
          return {
            id: generateId(),
            type: "element",
            elementId: "0c44ac338d7249b39271d0b25425b7d9",
            position: [0, 0],
            size: [25, 25],
            receiver: false,
            dragCurrent: false,
            selectedStartingIndex: 0,
            countConfig: [0, 5],
            labelStartingIndex: 0,
            ...component,
          };
        case "table":
          return {
            id: generateId(),
            type: "table",
            position: [0, 0],
            columns: 3,
            padding: "2px",
            elements: [],
            elementsSize: [25, 25],
            ...component,
          };
        case "sometimeshint":
          return {
            id: generateId(),
            type: "sometimeshint",
            elementId: "4c1b24c3e3954038b14f4daa3656e0b5",
            position: [0, 0],
            labels: "sometimes",
            width: 150,
            color: "#ffffff",
            backgroundColor: "#333333",
            showIcon: true,
            inverted: false,
            ...component,
          };
        case "locationhint":
          return {
            id: generateId(),
            type: "locationhint",
            elementId: "4c1b24c3e3954038b14f4daa3656e0b5",
            position: [0, 0],
            labels: "locations",
            width: 250,
            color: "#ffffff",
            backgroundColor: "#4a8ab6",
            showBoss: true,
            showItems: true,
            ...component,
          };
        case "hinttable":
          return {
            id: generateId(),
            type: "hinttable",
            elementId: "4c1b24c3e3954038b14f4daa3656e0b5",
            position: component.position,
            hintType: "sometimes",
            hintNumber: 1,
            columns: 1,
            width: 200,
            padding: "2px",
            labels: "sometimes",
            color: "#ffffff",
            backgroundColor: "#333333",
            showIcon: true,
            inverted: false,
            showBoss: true,
            showItems: true,
            ...component,
          };
        case "label":
          return {
            id: generateId(),
            type: "label",
            position: component.position,
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: "2px",
            text: "",
            fontSize: "12px",
            ...component,
          };
        default:
          return component;
      }
    }),
  ];

  return {
    ...rawLayout,
    components: cleanedComponents,
  };
}

const Editor = () => {
  const [tab, setTab] = useState(0);

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
      let parsedLayout = JSON.parse(content);
      parsedLayout = prepareLayout(parsedLayout);
      setLayout(parsedLayout);
      setLayoutKey(Math.random());
    }
  };

  const handleLayoutSave = useCallback(() => {
    // pass data from localStorage API to blob
    let filename = "HashFrog_Tracker.layout";
    if (layout.layoutConfig.name) {
      filename = layout.layoutConfig.name.replace(/ /g, "_");
    }
    const jsonBlob = new Blob([JSON.stringify(layout)], { type: "text/plain" });
    FileSaver.saveAs(jsonBlob, `${filename}.json`);
  }, [layout]);

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-md-4">
          <div className="editor card card-dark">
            <div className="card-body">
              <div className="btn-row">
                <button type="button" className="btn btn-light btn-sm" onClick={initializeNewLayout}>
                  New Layout
                </button>
                <div>
                  <label htmlFor="open" className="btn btn-light btn-sm">
                    Load JSON
                  </label>
                  <input
                    key={layoutKey}
                    type="file"
                    id="open"
                    onChange={handleLayoutOpen}
                    style={{ display: "none" }}
                    accept=".json"
                  />
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleLayoutSave}>
                  Export to JSON
                </button>
              </div>
              <p className="uuid">Layout ID: {layout.id}</p>
              {layout.id && (
                <Fragment>
                  <div className="btn-row mb-3">
                    <button
                      type="button"
                      className={`btn btn-sm ${tab === 0 ? "btn-light" : "btn-dark"}`}
                      onClick={() => setTab(0)}
                    >
                      Layout Config
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${tab === 1 ? "btn-light" : "btn-dark"}`}
                      onClick={() => setTab(1)}
                    >
                      Components Config
                    </button>
                  </div>
                  <div style={{ display: tab === 0 ? "unset" : "none" }}>
                    <EditorLayoutConfig layoutConfig={layout.layoutConfig} setLayoutConfig={setLayoutConfig} />
                  </div>
                  <div style={{ display: tab === 1 ? "unset" : "none" }}>
                    <EditorComponentsList components={layout.components} setLayout={setLayout} />
                  </div>
                </Fragment>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-8">
          {layout.id && <Layout layout={layout} editing hideFooter />}
          {!layout.id && (
            <div className="card card-dark">
              <div className="card-body">
                <p className="my-3">Initialize or load a layout to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
