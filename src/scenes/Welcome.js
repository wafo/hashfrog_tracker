import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Footer from "../components/Footer";
import welcome from "./welcome.md";

const baseURL = process.env.PUBLIC_URL;

const Welcome = () => {
  const [markdown, setMarkdown] = useState(null);

  useEffect(() => {
    fetch(welcome)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, []);

  const launchTracker = () => {
    const url = `${baseURL}/tracker`;
    window.open(
      url,
      "HashFrog Tracker",
      "toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=331,height=690"
    );
  };

  return (
    <div style={{ color: "#fff" }}>
      <button type="button" onClick={launchTracker}>
        Launch tracker
      </button>
      <ReactMarkdown>{markdown}</ReactMarkdown>
      <div style={{ margin: "2rem 0" }}>
        <Footer />
      </div>
    </div>
  );
};

export default Welcome;
