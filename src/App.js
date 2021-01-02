import "./App.css";

import React from "react";
import { CrawlGraph, sanitizeURL } from "./CrawlGraph";
import { CrawlForm } from "./CrawlForm";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.crawlURLCallback = this.crawlURLCallback.bind(this);
    this.state = {
      submitState: "NOINPUT",
    };
  }
  crawlURLCallback(url) {
    this.startingURL = sanitizeURL(url);
    this.setState({ submitState: "VALIDATING" });
  }
  render() {
    return (
      <div>
        {this.state.submitState === "NOINPUT" && (
          <CrawlForm crawlURLCallback={this.crawlURLCallback} />
        )}
        {this.state.submitState === "VALIDATING" && (
          <CrawlGraph startingURL={this.startingURL} />
        )}
      </div>
    );
  }
}

export default App;
