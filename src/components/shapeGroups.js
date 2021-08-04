/*

*/
import React from 'react'
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text, Row, Col, Container, Grid } from 'react-bootstrap';
import Icon from './font-awesome';
class ShapeGroups extends React.Component {

    constructor(props) {
        super();
    }

    setPcsCount(name, count) {
        alert('test');
    }
    
    render() {
        return (
            <div style={{ backgroundColor: '#443B34' }}>
                <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                    <Col>
                        <span style={{ fontSize: '16px' }}>SELECT Shape</span>
                    </Col>
                </Row>
                <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                    <Col>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="graduation_with_text.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.selectModelNo(1)} ></img>
                            <span >Graduation Cap</span>
                        </div>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="graduation_with_textLight.jpg" 
                            style={{ paddingBottom: '5px' }} onClick={() => this.props.selectModelNo(2)} > 
                            </img>
                            <span >Graduation Cap</span>
                        </div>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="text.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.selectModelNo(3)} ></img>
                            <span >Only Text</span>
                        </div>
                        <div style={{ width: '108px', display: 'inline-block', margin: '10px', paddingBottom: '5px' }}>
                            <img className="shape" src="newlyweds_with_text.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.selectModelNo(4)} >
                            </img>
                            <span >Newly Weds</span>
                        </div>
                    </Col>
                </Row>
            </div>
        )
    }
}
export default ShapeGroups;