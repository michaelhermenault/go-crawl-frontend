import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import React from "react";
import "./CrawlForm.css";

class CrawlForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.state = {
      formText: "",
    };
  }
  handleSubmit(event) {
    this.props.crawlURLCallback(this.state.formText);
    event.preventDefault();
  }
  render() {
    return (
      <div className="CrawlForm">
        <Form onSubmit={this.handleSubmit}>
          <Form.Group size="lg">
            <Form.Control
              placeholder="ex. wikipedia.org"
              autoFocus
              value={this.state.formText}
              onChange={(e) => this.setState({ formText: e.target.value })}
            />
          </Form.Group>

          <Button block size="lg" type="submit" disabled={false}>
            Crawl!
          </Button>
        </Form>
      </div>
    );
  }
}

export { CrawlForm };
