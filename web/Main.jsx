import React from "react";
import { render } from "react-dom";
import axios from "axios";

class PixelItem extends React.Component {

    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.validateInput = this.validateInput.bind(this);
        this.requestTag = this.requestTag.bind(this);
        this.state = {
            tagsValue: ""
        };
        setTimeout(() => {
            this.requestTag();
        }, 0);
    }

    requestTag() {
        const secret = new URL(window.location.href).searchParams.get("secret");
        axios({
            url: `/gettag?name=${this.props.name}&secret=${secret}`,
            method: "get",
        }).then((response) => {
            this.setState({
                tagsValue: response.data.join(",")
            });
        }).catch((error) => {
            this.appendMessage(error.response);
        });
    }

    validateInput() {
        this.setState({
            tagsValue: this.refs.inputTags.value
        });
    }

    handleClick() {
        this.props.setTags(this.props.name, this.state.tagsValue);
    }

    render() {
        return (
            <tr>
                <td><img src={`/${this.props.name}.png`} /></td>
                <td>{this.props.name}</td>
                <td><input type="text" ref="inputTags" onChange={this.validateInput} value={this.state.tagsValue} /></td>
                <td><button type="button" onClick={this.handleClick}>Commit</button></td>
            </tr>
        );
    }
}

class Main extends React.Component {

    constructor() {
        super();

        this.requestList = this.requestList.bind(this);
        this.setTags = this.setTags.bind(this);

        this.state = {
            entries: [],
            messages: [(<div key="0">Messages:</div>)]
        };

        this.requestList();
    }

    appendMessage(msg) {
        const newarr = this.state.messages;
        newarr.push(
            <div key={this.state.messages.length}>{JSON.stringify(msg)}</div>
        );
        this.setState({
            messages: newarr
        });
    }

    setTags(name, tags) {
        const secret = new URL(window.location.href).searchParams.get("secret");
        axios({
            url: `/update?name=${name}&tags=${tags}&secret=${secret}`,
            method: "get",
        }).then((response) => {
            this.appendMessage(response.data);
        }).catch((error) => {
            this.appendMessage(error.response);
        });
    }

    requestList() {
        const secret = new URL(window.location.href).searchParams.get("secret");
        const axiosConfig = {
            url: `/list?secret=${secret}`,
            method: "get",
        };

        axios(axiosConfig).then((response) => {
            const arr = [];
            for (let i = 0; i < response.data.length; i++) {
                const element = response.data[i];
                arr.push(
                    <PixelItem key={i} name={element} setTags={this.setTags} />
                );
                this.setState({
                    entries: arr
                });
            }
        }).catch((error) => {
            this.appendMessage(error.response);
        });
    }

    render () {
        return (
            <div>
                <div className="resultPane">{this.state.messages}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Tags</th>
                            <th>Commit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.entries}
                    </tbody>
                </table>
            </div>
        );
    }

}

render(<Main />, document.getElementById("root"));