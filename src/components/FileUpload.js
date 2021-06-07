import React from 'react'
import axios from 'axios';

class FileUpload extends React.Component {

    constructor() {
        super();

        const fileReader = new FileReader();

        this.state = {
            fileReader: FileReader,
            selectedFile: '',
        }
        this.state.fileReader = new FileReader;

        this.handleFileRead = this.handleFileRead.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    }
    handleFileRead(){
        const content = this.state.fileReader.result;
        console.log(content)
    }
    handleInputChange(event) {
        const data = new FormData();
        this.state.fileReader.onloadend = this.handleFileRead;
        data.append('file', this.state.selectedFile);
        this.setState({
            selectedFile: event.target.files[0],
        })
    }

    submit() {
        const data = new FormData();
        this.state.fileReader.onloadend = this.handleFileRead;
        this.state.fileReader.readAsText(this.state.selectedFile);

        data.append('file', this.state.selectedFile);
        console.log(this.state.selectedFile);
        let url = "http://localhost:8000/upload.php";
        console.log('test');
        axios.post(url, data, { // receive two parameter endpoint url ,form data 
        })
            .then(res => { // then print response status
                console.warn(res);
            })

    }

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-md-12 offset-md-3">
                        <br /><br />

                        <h3 className="text-white">React File Upload</h3>
                        <br />
                        <div className="form-row">
                            <div className="form-group col-md-12">
                                <label className="text-white">Select File :</label>
                                <input type="file" className="form-control" name="upload_file" onChange={this.handleInputChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col-md-12">
                                <button type="submit" className="btn btn-dark" onClick={() => this.submit()}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        )
    }
}

export default FileUpload;