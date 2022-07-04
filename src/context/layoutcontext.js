import { useContext, useReducer, createContext } from "react";
import defaultLayout from "../layouts/default.layout.json";

function getInitialLayout() {
  let layout = localStorage.getItem("layout");
  return layout ? JSON.parse(layout) : { ...defaultLayout };
}

function setLayoutCache(layout) {
  const layoutString = JSON.stringify(layout);
  localStorage.setItem("layout", layoutString);
}

const initialState = getInitialLayout();
const LayoutContext = createContext();

function reducer(state, action) {
  switch (action.type) {
    case "LAYOUT_UPDATE": {
      setLayoutCache(action.payload);
      return { ...action.payload };
    }
    case "LAYOUT_DEFAULT": {
      setLayoutCache(defaultLayout);
      return { ...defaultLayout };
    }
    default:
      throw new Error();
  }
}

function LayoutProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return <LayoutContext.Provider value={{ state, dispatch }} {...props} />;
}

const useLayout = () => useContext(LayoutContext);

export { LayoutProvider, useLayout };
