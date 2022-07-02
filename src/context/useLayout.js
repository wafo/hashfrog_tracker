import { useContext, useReducer, createContext } from "react";
import defaultLayout from "../layouts/default.layout.json";

const initialState = {
  layouts: [defaultLayout],
  layout: defaultLayout
};

const LayoutContext = createContext();

function reducer(state, action) {
  switch (action.type) {
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
