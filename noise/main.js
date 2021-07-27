const express = require('express');
const app = express();

const port = 4000;
var bodyParser = require('body-parser');
var Jimp = require("jimp");
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000 }));
app.use(bodyParser.json());
const data = {
    portal: "NoiseRemoval",
    knowledge: "unlimited",
    location: "Istanbul"
}
/*app.get('/', (req, res) => {
    res.send('Hello World!');
    //res.send('test me dude');
});
Jimp.read("Optımized.jpg").then(function (image) {
    image
        .color([
            { apply: 'brighten', params: [20] }
        ])
        .contrast(1)
        .greyscale()
        .getBase64(Jimp.AUTO,(err,res)=>{
            console.log(res);
        })
        .write("img-optimororza.jpg");
}).catch(function (err) {
    console.error(err);
});*/

app.post('/', function (req, res) {
    var result = res;
    var imgData = req.body.data.data;
    var buff = new Buffer(req.body.data.data
        .replace(/^data:image\/(png|gif|jpeg);base64,/, ''), 'base64');
    let imageBuffer = Buffer.from(imgData);
    var handledImage;
    Jimp.read(buff).then(function (image) {
        image.color([
            { apply: 'brighten', params: [20] }
        ])
            .contrast(1)
            .greyscale()
            .getBase64(Jimp.AUTO, (err, res) => {
                handledImage = res;
                //console.log(handledImage);
                result.send(handledImage);
            })
            .write("img-optimor.jpg");
    }).catch(function (err) {
        console.error('error hAPPENED');

        console.error(err);
    });
    
    
});
/*const myData = req;
    console.log(myData);
    res.send(req.body);*/


/*app.post('/create', function (req, res) {
    var newBook = JSON.parse(req.body.data)
    books.push(newBook)
    console.log(books);
})*/
/*app.get('/', (req, res) => {
    res.json(data);
    //res.send('test me dude');
});*/

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
}) 

app.use(express.static('public'))

//this software to be developed to a better solution that shows a better case study, 




