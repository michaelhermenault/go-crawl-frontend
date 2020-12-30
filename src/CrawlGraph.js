import ForceGraph2D from "react-force-graph-2d";
import React from "react";
import axios from "axios";
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
  // console.log("------");
  // console.log(targetTime);
  // console.log(ans);
  // console.log(links);
  return ans;
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
        this.babyLinks.push({
          source: result.Parent.replace(/(^\w+:|^)\/\/(www\.)?/, ""),
          target: child.replace(/(^\w+:|^)\/\/(www\.)?/, ""),
          depth: result.Depth,
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
        newNodes.push({
          id: this.babyLinks[i].target,
          depth: this.babyLinks[i].depth,
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
        backgroundColor="grey"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label =
            node.id.length > maxNodeLabelLength
              ? node.id.slice(0, maxNodeLabelLength) + "..."
              : node.id;

          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth * 1.2, fontSize * 1.2].map(
            (n) => n + fontSize * 0.2
          ); // some padding

          ctx.fillStyle = node.color;

          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            ...bckgDimensions
          );

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
          ctx.fillText(label, node.x, node.y);
        }}
      />
    );
  }
}

export { CrawlGraph };
