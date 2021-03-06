import { Fragment } from "react";

const name = process.env.REACT_APP_NAME;
const version = process.env.REACT_APP_VERSION;

const Footer = props => {
  const { showGitHub = true, opacity = 1 } = props;

  return (
    <Fragment>
      <p style={{ fontSize: "0.75rem", opacity, marginBottom: 0 }}>
        {name} v{version}{" "}
        {showGitHub && (
          <span>
            - Source code on <a href="https://github.com/wafo/hashfrog_tracker">GitHub</a>
          </span>
        )}
      </p>
    </Fragment>
  );
};

export default Footer;
