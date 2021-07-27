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
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
                                <span>Eid 1</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
                                <span>Eid 2</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
                                <span>Eid 3</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
                                <span>Eid 4</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
                                <span>Eid 5</span>
                            </div>
                            <div className="form-group col-md-2">
                                <img className="shape" width="120px" src="eidgroup1.jpg" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('decorated')} ></img>
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