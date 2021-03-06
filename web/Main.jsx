import React from "react";
import { render } from "react-dom";
import axios from "axios";

class PixelItem extends React.Component {

    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.validateInput = this.validateInput.bind(this);
        this.validateInputLove = this.validateInputLove.bind(this);
        this.requestTag = this.requestTag.bind(this);
        this.state = {
            tagsValue: "",
            lovesValue: "",
            requesting: false
        };
        setTimeout(() => {
            this.requestTag();
        }, 0);
    }

    requestTag() {
        const secret = new URL(window.location.href).searchParams.get("secret");
        this.setState({ requesting: "disabled" });
        axios({
            url: `/getdata?name=${this.props.name}&secret=${secret}`,
            method: "get",
        }).then((response) => {
            this.setState({
                tagsValue: response.data.tags.join(","),
                lovesValue: response.data.loves.toString(),
                requesting: false
            });
        }).catch((error) => {
            this.props.parentRef.appendMessage(error.response, "err");
            this.setState({ requesting: false });
        });
    }

    validateInput() {
        this.setState({
            tagsValue: this.refs.inputTags.value
        });
    }

    validateInputLove() {
        let val = parseInt(this.refs.inputLoves.value);
        if (isNaN(val)) {
            val = 0;
        }
        this.setState({
            lovesValue: val.toString()
        });
    }

    handleClick() {
        if (this.state.tagsValue.match(/^[a-z0-9]+(,[a-z0-9]+)*$/g)) {
            this.setState({ requesting: "disabled" });
            const secret = new URL(window.location.href).searchParams.get("secret");
            const url = `/update?name=${this.props.name}&tags=${this.state.tagsValue}&loves=${parseInt(this.state.lovesValue)}&secret=${secret}`;
            this.props.parentRef.appendMessage(`Request sent: ${url}`, "ok");
            axios({
                url: url,
                method: "get",
            }).then((response) => {
                this.props.parentRef.appendMessage(response.data, "ok");
                this.setState({ requesting: false });
            }).catch((error) => {
                this.props.parentRef.appendMessage(error.response, "err");
                this.setState({ requesting: false });
            });
        } else {
            this.props.parentRef.appendMessage("Example: abc123,efg,345,test777", "err");
        }
    }

    render() {
        return (
            <tr>
                <td><img src={`/${this.props.name}.png`} /></td>
                <td>{this.props.name}</td>
                <td><input type="text" ref="inputTags" onChange={this.validateInput} value={this.state.tagsValue} /></td>
                <td><input type="text" ref="inputLoves" onChange={this.validateInputLove} value={this.state.lovesValue} /></td>
                <td><button type="button" disabled={this.state.requesting} onClick={this.handleClick}>Commit</button></td>
            </tr>
        );
    }
}

class Main extends React.Component {

    constructor() {
        super();
        this.requestList = this.requestList.bind(this);
        this.state = {
            entries: [],
            messages: [(<div key="0">Messages:</div>)]
        };

        this.requestList();
    }

    appendMessage(msg, prefix) {
        const newarr = this.state.messages;
        let style = {};
        if (prefix == "ok") {
            style = {
                color: "green"
            };
        } else if (prefix == "err") {
            style = {
                color: "red"
            };
        }
        newarr.push(
            <div key={this.state.messages.length}>
                <span style={style}>[{prefix}]</span>
                <span>{JSON.stringify(msg)}</span>
            </div>
        );
        this.setState({
            messages: newarr
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
                    <PixelItem key={i} name={element} parentRef={this} />
                );
            }
            this.setState({
                entries: arr
            });
        }).catch((error) => {
            this.appendMessage(error.response, "err");
        });
    }

    render() {
        return (
            <div>
                <div className="resultPane">{this.state.messages}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Tags</th>
                            <th>Loves</th>
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