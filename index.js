const express = require('express');
const bodyParser = require('body-parser');

const fs = require('fs')

//const prettyJs = require('pretty-js');
const beautify = require('js-beautify').js;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


fs.readFile('const.js', 'utf8', function (err, data) {
    if (err) {
        throw err;
    }
    console.log(beautify(data, { indent_size: 2, space_in_empty_paren: true }));
});

// try {
//     let data = fs.readFileSync('./const','utf-8')
//     console.log(data)
// } catch (err) {
//     console.error(err)
// }

// let code = '';
// console.log(prettyJs(code)); 

// let options = {
//     indent: "\t",  // Switch to tabs for indentation
//     newline: "\r\n"  // Windows-style newlines
// };
// console.log(prettyJs(code, options));

const port= process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Server is up and running on port numner ' + port);
});