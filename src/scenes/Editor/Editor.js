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
    backgroundColor: "#222222",
    width: 300,
    height: 500,
    fontFamily: null,
    fontSize: null,
    fontColor: null,
  },
  components: [],
};

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
          {layout.id && <Layout layout={layout} hideFooter />}
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
