import React from 'react'
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text, Row, Col, Container, Grid } from 'react-bootstrap';
import Icon from './font-awesome';
class MainShapes extends React.Component {
    constructor(props) {
        super();
    }
    setPcsCount(name, count) {
        alert('test');
    }
    render() {
        return (

            <div id="main3" className="panel panel-danger  well-sm" style={{ padding: '0', marginBottom: 7, color: 'white' }}  >
                <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "white" }}>
                    <span style={{ fontSize: '16px' }}>SELECT Box Type</span><br />
                    <span style={{ fontSize: '12px' }}>Choose a shape of your choice to start customizing.</span>
                </div>
                <Form onSubmit={this.handleSubmission} >
                    <div style={{ backgroundColor: '#443B34' }}>
                        <Row style={{ marginLeft: '10px', fontSize: "15px", textAlign: 'center' }}>
                            <Col>
                                <div style={{ width: '235px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                    <img className="shape" src="mainBox.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.handleShape('decorated')} ></img>
                                    <span>Decorated Boxes</span>
                                </div>
                                <div style={{ width: '235px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                    <img className="shape" src="mainBox.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.handleShape('decorated')} ></img>
                                    <span>Leather Boxes</span>
                                </div>
                                <div style={{ width: '235px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                    <img className="shape" src="mainBox.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.handleShape('decorated')} ></img>
                                    <span>Wooden Boxes</span>
                                </div>
                                <div style={{ width: '235px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                    <img className="shape" src="mainBox.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.handleShape('decorated')} ></img>
                                    <span>Golden Boxes</span>
                                </div>
                                <div style={{ width: '235px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                    <img className="shape" src="mainBox.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.handleShape('decorated')} ></img>
                                    <span>Magentic Boxes</span>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </div>
        )
    }
}
export default MainShapes;