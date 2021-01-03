import React from "react";
import { CrawlGraph } from "./CrawlGraph";
import { CrawlForm } from "./CrawlForm";
import axios from "axios";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";

import "./CrawlForm.css";

const pollingPeriod = 2000;
const animationPeriod = 50;
const animationTimeScale = 3;

function createImageContainerForDomain(domain) {
  let img = new Image();
  let imgContainer = { imgLoaded: false, image: img };

  img.onload = function () {
    imgContainer.imgLoaded = true;
  };
  img.src = "https://www.google.com/s2/favicons?domain=" + domain;

  return imgContainer;
}

function getDomain(url) {
  return url.replace(/https?:\/\//, "").split(/[/?#]/)[0];
}

function sanitizeURL(url) {
  return url.replace(/(^\w+:|^)\/\/(www\.)?/, "");
}

function allBeforeTime(links, targetTime) {
  let start = 0;
  let end = links.length - 1;
  let ans = -1;
  while (start <= end) {
    let mid = Math.floor((start + end) / 2);

    // Move to the left side if the target is smaller
    if (links[mid].timeFound >= targetTime) {
      end = mid - 1;
    }

    // Move right side
    else {
      ans = mid;
      start = mid + 1;
    }
  }

  return ans;
}

class App extends React.Component {
  componentDidMount() {
    this.existingNodes = new Set().add(this.startingURL);
    this.exisitingEdges = new Set();
    this.babyLinks = [];
  }

  startCrawl(startingURL) {
    axios
      .post("https://crawl.hermenault.dev/crawl/", {
        url: "https://" + startingURL,
      })
      .then((res) => {
        this.fetchFirstCrawlResults(res.data.resultsURL);
      });
  }

  // Special case for first results fetched. Handles error cases and sets animation timings.
  fetchFirstCrawlResults(resultsURL) {
    axios.get(resultsURL).then((res) => {
      // We've actually retrieved some results
      if (res.data.edges.length > 0) {
        if (
          res.data.hasOwnProperty("_links") &&
          res.data._links.hasOwnProperty("next")
        ) {
          // Fetch the next set of data.

          this.startTime = Date.now();
          this.queueCrawlResults(res.data.edges);
          setTimeout(
            this.fetchCrawlResults.bind(this, res.data._links.next.href),
            pollingPeriod
          );
          this.displayCrawlResults();
          this.setState({
            submitState: "VALIDATED",
          });
        } else {
          this.setState({ submitState: "ERROR" });
        }
      } else {
        setTimeout(
          this.fetchFirstCrawlResults.bind(this, res.data._links.next.href),
          pollingPeriod
        );
      }
    });
  }

  // Gets a batch of results from the API and queues the next batch if there are any remaining.
  fetchCrawlResults(resultsURL) {
    axios.get(resultsURL).then((res) => {
      if (
        res.data.hasOwnProperty("_links") &&
        res.data._links.hasOwnProperty("next")
      ) {
        // Fetch the next set of data.
        setTimeout(
          this.fetchCrawlResults.bind(this, res.data._links.next.href),
          pollingPeriod
        );
      }
      this.queueCrawlResults(res.data.edges);
    });
  }

  // Turns raw results from API into frames to be displayed
  queueCrawlResults(newResults) {
    for (const result of newResults) {
      for (const child of result.Children) {
        let imgContainer = createImageContainerForDomain(getDomain(child));

        this.babyLinks.push({
          source: sanitizeURL(result.Parent),
          target: sanitizeURL(child),
          depth: result.Depth,
          targetImageContainer: imgContainer,
          // Convert from nanoseconds to milliseconds
          timeFound: (animationTimeScale * result.TimeFound) / 1000000,
        });
      }
    }
  }

  // Adds results to the graph when they should be added
  displayCrawlResults() {
    if (this.babyLinks.length === 0) {
      setTimeout(this.displayCrawlResults.bind(this), animationPeriod);
      return;
    }

    const lastBabyLinkToDisplay = allBeforeTime(
      this.babyLinks,
      Date.now() - this.startTime
    );

    if (lastBabyLinkToDisplay < 0) {
      setTimeout(this.displayCrawlResults.bind(this), animationPeriod);
      return;
    }

    let newNodes = [];
    let newLinks = [];
    for (let i = 0; i < lastBabyLinkToDisplay; i++) {
      if (!this.existingNodes.has(this.babyLinks[i].target)) {
        newNodes.push({
          id: this.babyLinks[i].target,
          depth: this.babyLinks[i].depth,
          imageContainer: this.babyLinks[i].targetImageContainer,
        });
        this.existingNodes.add(this.babyLinks[i].target);
      }
      this.exisitingEdges.add(this.babyLinks[i]);
      newLinks.push(this.babyLinks[i]);
    }
    this.setState({
      graphData: {
        nodes: this.state.graphData.nodes.concat(newNodes),
        links: this.state.graphData.links.concat(newLinks),
      },
    });

    this.babyLinks = this.babyLinks.slice(lastBabyLinkToDisplay);
    setTimeout(this.displayCrawlResults.bind(this), animationPeriod);
  }

  constructor(props) {
    super(props);
    this.crawlURLCallback = this.crawlURLCallback.bind(this);
    this.state = {
      submitState: "NOINPUT",
    };
  }
  crawlURLCallback(url) {
    this.startingURL = sanitizeURL(url);
    this.startCrawl(this.startingURL);
    this.setState({
      submitState: "VALIDATING",
      graphData: {
        nodes: [
          {
            id: this.startingURL,
            imageContainer: createImageContainerForDomain(
              getDomain(this.startingURL)
            ),
          },
        ],
        links: [],
      },
    });
  }
  render() {
    return (
      <div>
        {this.state.submitState === "NOINPUT" && (
          <CrawlForm crawlURLCallback={this.crawlURLCallback} />
        )}
        {this.state.submitState === "VALIDATING" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Spinner animation="border" role="status">
              <span className="sr-only">Loading...</span>
            </Spinner>
          </div>
        )}
        {this.state.submitState === "VALIDATED" && (
          <CrawlGraph graphData={this.state.graphData} />
        )}
        {this.state.submitState === "ERROR" && (
          <Alert
            variant="warning"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Web Crawler couldn't find any links at this url, please refresh and
            try another.
          </Alert>
        )}
      </div>
    );
  }
}

export default App;
