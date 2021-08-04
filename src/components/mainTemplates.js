/*                      */
import React from 'react'
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text, Row, Col, Container, Grid } from 'react-bootstrap';

class MainTemplates extends React.Component {
    constructor(props) {
        super();
    }
    render() {
        return (
            <div style={{ backgroundColor: '#443B34' }}>
                <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                    <Col>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="girl.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.mainTemplate('photo')} ></img>
                            <span >Your Photo Here</span>
                        </div>

                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="baby_clothes_boy.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.mainTemplate('readymade')} ></img>
                            <span >Baby Clothes</span>
                        </div>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="text.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.mainTemplate('text')} ></img>
                            <span >Text</span>
                        </div>

                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="logo.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.mainTemplate('logo')} ></img>
                            <span >Logo</span>
                        </div>

                    </Col>
                </Row>
            </div>
        )
    }
}
export default MainTemplates;