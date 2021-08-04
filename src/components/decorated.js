import React from 'react'
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text, Row, Col, Container, Grid } from 'react-bootstrap';
import Icon from './font-awesome';

class Decorated extends React.Component {
    constructor(props) {
        super();
    }
    setPcsCount(name,count){
        alert('test');
    }
    render() {
        return (
            
                <div id="main2" className="panel panel-danger  well-sm" style={{ padding: '0', marginBottom: 7, color: 'white' }}  >
                    <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "white" }}>
                        <span style={{ fontSize: '16px' }}>SELECT Box Type</span><br />
                        <span style={{ fontSize: '12px' }}>Choose a shape of your choice to start customizing.</span>
                    </div>
                    <Form onSubmit={this.handleSubmission} >
                        <div style={{ backgroundColor: '#443B34' }}>
                            <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                                <Col>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold1', 1)} ></img>
                                        <span >Golden 1 PC</span>
                                    </div>

                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold2', 2)} ></img>
                                        <span >Golden 2 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold3', 3)} ></img>
                                        <span >Golden 3 PCs</span>
                                    </div>

                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold4', 4)} ></img>
                                        <span >Golden 4 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold6', 6)} ></img>
                                        <span >Golden 6 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold8', 8)} ></img>
                                        <span >Golden 8 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold12', 12)} ></img>
                                        <span >Golden 12 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold16', 16)} ></img>
                                        <span >Golden 16 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold24', 24)} ></img>
                                        <span >Golden 24 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold32', 32)} ></img>
                                        <span >Golden 32 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('gold50', 50)} ></img>
                                        <span >Golden 50 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver1', 1)} ></img>
                                        <span >Silver 1 PC</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver2', 2)} ></img>
                                        <span >Silver 2 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver3', 3)} ></img>
                                        <span >Silver 3 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver4', 4)} ></img>
                                        <span >Silver 4 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver6', 6)} ></img>
                                        <span >Silver 6 PCs</span>
                                    </div>
                                    <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                                        <img className="shape" src="mainBoxSmall.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.setPcsCount('silver12', 12)} ></img>
                                        <span >Silver 12 PCs</span>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                        <div style={{ margin: '20px' }}>
                        <Button bsSize="lg" bsStyle="warning" onClick={this.props.step1}> <Icon name="angle-left" /></Button>
                        <Button bsSize="lg" style={{ float: 'right', marginLeft: '8px' }} onClick={this.props.step3} bsStyle="warning"> <Icon name="angle-right" /></Button>
                        </div>
                    </Form>
                </div>
            
        )
    }
}
export default Decorated;