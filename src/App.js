import "./App.css";
import { CrawlGraph } from "./CrawlGraph";
import nickel from "./nickel.webp"; // Tell webpack this JS file uses this image
function App() {
  return (
    <div>
      <img src={nickel} alt="Nickel" />
      <CrawlGraph />;
    </div>
  );
}

export default App;
