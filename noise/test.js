const express = require('express');
const app = express();

const port = 4000;
var bodyParser = require('body-parser');
var Jimp = require("jimp");
app.use(express.json({ limit: '50mb' }));
Jimp.read("https://sawtru.com.tr/realSSS.jpg").then(function (lenna) {
    lenna.contrast(1)
        .greyscale()
        .getBase64(Jimp.MIME_JPEG, function (err, src) {
        })
        .write("imgay-optimor.jpg");

}).catch(function (err) {
    console.error(err);
});








