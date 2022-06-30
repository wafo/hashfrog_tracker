import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Footer from "../components/Footer";

import welcome from "./welcome.md";

const About = () => {
  const [markdown, setMarkdown] = useState(null);

  useEffect(() => {
    fetch(welcome)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, []);

  return (
    <div>
      <ReactMarkdown>{markdown}</ReactMarkdown>
      <div style={{ margin: "2rem 0" }}>
        <Footer />
      </div>
    </div>
  );
};

export default About;