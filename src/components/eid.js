import React from 'react'

class Eid extends React.Component {
    constructor(props) {
        super();
    }
    render(){
        return(
            <div>
                <div className="row"><br></br></div>
                <div className="row">
                    <div className="col-md-12 offset-md-3">
                        <div className="form-row">
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="graduateThump.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(0)} ></img>
                                <span>Eid 1</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eid1Thump.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(1)} ></img>
                                <span>Eid 2</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="fancy_getwellsoon_en-01.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(2)} ></img>
                                <span>Eid 3</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="thumb_eid5.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(3)} ></img>
                                <span>Eid 4</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(4)} ></img>
                                <span>Eid 5</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.props.chooseShape(5)} ></img>
                                <span>Eid 6</span>
                            </div>
                        </div>
                    </div>
                    
                </div>

            </div>        
        )
    }
}
export default Eid;