import { Graph } from "react-d3-graph";
import React from "react";
import axios from "axios";
// the graph configuration, you only need to pass down properties
// that you want to override, otherwise default ones will be used
const myConfig = {
  nodeHighlightBehavior: true,
  node: {
    color: "lightgreen",
    size: 120,
    highlightStrokeColor: "blue",
  },
  link: {
    highlightColor: "lightblue",
  },
};

const pollingPeriod = 2000;
const startingURL = "https://google.com";

// graph event callbacks

const onDoubleClickNode = function (nodeId) {
  window.alert(`Double clicked node ${nodeId}`);
};

const onMouseOverNode = function (nodeId) {
  // window.alert(`Mouse over node ${nodeId}`);
};

const onMouseOutNode = function (nodeId) {
  //   window.alert(`Mouse out node ${nodeId}`);
};

class CrawlGraph extends React.Component {
  componentDidMount() {
    // this.startCrawl();
  }

  startCrawl() {
    axios
      .post("https://crawl.hermenault.dev/crawl/", {
        url: startingURL,
      })
      .then((res) => {
        // console.log(res);
        setTimeout(
          this.fetchCrawlResults.bind(this, res.data.resultsURL),
          pollingPeriod
        );
      });
  }

  fetchCrawlResults(resultsURL) {
    console.log("foo" + resultsURL);
    axios.get(resultsURL).then((res) => {
      if (
        res.data.hasOwnProperty("_links") &&
        res.data._links.hasOwnProperty("next")
      ) {
        setTimeout(
          this.fetchCrawlResults.bind(this, res.data._links.next.href),
          pollingPeriod
        );
      }
      this.displayCrawlResults(res.data.edges);
    });
  }

  displayCrawlResults(newResults) {
    let newNodes = [];
    let newEdges = [];
    // console.log(newResults);
    for (const result of newResults) {
      // console.log(result);
      for (const child of result.Children) {
        newNodes.push({ id: child });
        newEdges.push({ source: result.Parent, target: child });
      }
    }
    console.log(newNodes);
    console.log(newEdges);
    this.setState({
      graphData: {
        nodes: this.state.graphData.nodes.concat(newNodes),
        links: this.state.graphData.links.concat(newEdges),
      },
    });
  }

  onClickNode(nodeId) {
    // const graph = Object.assign({}, this.state.graphData, {
    //   nodes: [{ id: "Harry" }, { id: "Sally" }, { id: "Alice" }],
    //   links: [
    //     { source: "Harry", target: "Sally" },
    //     { source: "Alice", target: "Sally" },
    //   ],
    // });
    // this.setState({ graphData: graph });
  }

  constructor(props) {
    super(props);

    this.state = {
      existingNodes: new Set().add(startingURL),
      graphData: {
        nodes: [{ id: startingURL }],
      },
    };
  }

  render() {
    return (
      <Graph
        id="graph-id" // id is mandatory, if no id is defined rd3g will throw an error
        data={this.state.graphData}
        config={myConfig}
        onClickNode={(nodeId) => this.onClickNode(nodeId)}
        onDoubleClickNode={onDoubleClickNode}
        onMouseOverNode={onMouseOverNode}
        onMouseOutNode={onMouseOutNode}
      />
    );
  }
}

export { CrawlGraph };
