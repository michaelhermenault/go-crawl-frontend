import ForceGraph2D from "react-force-graph-2d";
import React from "react";
import axios from "axios";
import logo192 from "./logo192.png"; // Tell webpack this JS file uses this image
// the graph configuration, you only need to pass down properties
// that you want to override, otherwise default ones will be used

// const data = {
//   nodes: [{ id: "Jane" }, { id: "John" }],
//   links: [{ source: "Jane", target: "John" }],
// };

const pollingPeriod = 2000;
const startingURL = "xkcd.com";
const animationPeriod = 50;
const maxNodeLabelLength = 20;

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

class CrawlGraph extends React.Component {
  componentDidMount() {
    this.existingNodes = new Set().add(startingURL);
    this.exisitingEdges = new Set();
    this.babyLinks = [];
    this.startCrawl();
  }

  startCrawl() {
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
        let img = new Image();
        console.log(getDomain(child));
        img.src =
          "https://www.google.com/s2/favicons?domain=" + getDomain(child);

        this.babyLinks.push({
          source: result.Parent.replace(/(^\w+:|^)\/\/(www\.)?/, ""),
          target: child.replace(/(^\w+:|^)\/\/(www\.)?/, ""),
          depth: result.Depth,
          targetImage: img,
          // Convert from nanoseconds to milliseconds
          timeFound: result.TimeFound / 1000000,
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
        // console.log(urlParts[0]);
        newNodes.push({
          id: this.babyLinks[i].target,
          depth: this.babyLinks[i].depth,
          image: this.babyLinks[i].targetImage,
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

    this.state = {
      graphData: {
        nodes: [{ id: startingURL }],
        links: [],
      },
    };
  }
  render() {
    return (
      <ForceGraph2D
        nodeAutoColorBy="depth"
        enableNodeDrag={false}
        graphData={this.state.graphData}
        backgroundColor="white"
        nodeCanvasObject={(node, ctx, globalScale) => {
          // const label =
          //   node.id.length > maxNodeLabelLength
          //     ? node.id.slice(0, maxNodeLabelLength) + "..."
          //     : node.id;

          // const fontSize = 12 / globalScale;
          // ctx.font = `${fontSize}px Sans-Serif`;
          // const textWidth = ctx.measureText(label).width;
          // const bckgDimensions = [textWidth, fontSize].map(
          //   (n) => n + fontSize * 0.2
          // );

          // ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          // ctx.fillRect(
          //   node.x - bckgDimensions[0] / 2,
          //   node.y - bckgDimensions[1] / 2,
          //   ...bckgDimensions
          // );

          // ctx.textAlign = "center";
          // ctx.textBaseline = "middle";
          // ctx.fillStyle = node.color;
          // ctx.fillText(label, node.x, node.y);

          // var img = new Image();
          // img.src = logo192;
          // ctx.drawImage(img, node.x, node.y);
          if (node.image !== undefined)
            ctx.drawImage(node.image, node.x, node.y);
        }}
      />
    );
  }
}

export { CrawlGraph };
