import ForceGraph2D from "react-force-graph-2d";
import React from "react";
import axios from "axios";

const pollingPeriod = 2000;
const animationPeriod = 50;
const maxNodeLabelLength = 30;
const defaultIconSize = 20;
const scaleForLabels = 1.7;
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

function getDomain(url) {
  return url.replace(/https?:\/\//, "").split(/[/?#]/)[0];
}

function sanitizeURL(url) {
  return url.replace(/(^\w+:|^)\/\/(www\.)?/, "");
}

function drawIcon(imageContainer, ctx, xPos, yPos, iconSize) {
  if (imageContainer !== undefined && imageContainer.imgLoaded) {
    ctx.drawImage(imageContainer.image, xPos, yPos, iconSize, iconSize);
  }
}

class CrawlGraph extends React.Component {
  componentDidMount() {
    this.existingNodes = new Set().add(this.props.startingURL);
    this.exisitingEdges = new Set();
    this.babyLinks = [];
    this.startCrawl(this.props.startingURL);
  }

  startCrawl(startingURL) {
    axios
      .post("https://crawl.hermenault.dev/crawl/", {
        url: "https://" + startingURL,
      })
      .then((res) => {
        this.fetchCrawlResults(res.data.resultsURL);
        setTimeout(this.displayCrawlResults.bind(this), animationPeriod);
        this.startTime = Date.now() + 2000;
      });
  }

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
      } else {
      }
      this.queueCrawlResults(res.data.edges);
    });
  }

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
    console.log(props);
    this.state = {
      graphData: {
        nodes: [
          {
            id: this.props.startingURL,
            imageContainer: createImageContainerForDomain(
              getDomain(this.props.startingURL)
            ),
          },
        ],
        links: [],
      },
    };
  }
  render() {
    return (
      <ForceGraph2D
        enableNodeDrag={false}
        graphData={this.state.graphData}
        backgroundColor="white"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const drawnSize = defaultIconSize / globalScale;
          drawIcon(
            node.imageContainer,
            ctx,
            node.x - drawnSize / 2,
            node.y - drawnSize / 2,
            drawnSize
          );
          if (globalScale > scaleForLabels) {
            const label =
              node.id.length > maxNodeLabelLength
                ? node.id.slice(0, maxNodeLabelLength) + "..."
                : node.id;

            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(
              (n) => n + fontSize * 0.2
            );

            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y + drawnSize / 2,
              ...bckgDimensions
            );

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.fillText(
              label,
              node.x,
              node.y + bckgDimensions[1] / 2 + drawnSize / 2
            );
          }
        }}
      />
    );
  }
}

export { CrawlGraph, sanitizeURL };
