# express-easy-zip

[![Build Status](https://travis-ci.org/tanhauhau/express-easy-zip.svg?branch=master)](https://travis-ci.org/tanhauhau/express-easy-zip)
[![npm version](https://badge.fury.io/js/express-easy-zip.svg)](https://badge.fury.io/js/express-easy-zip)
[![Dependency status](https://david-dm.org/tanhauhau/express-easy-zip.svg)](https://david-dm.org)
[![Downloads](https://img.shields.io/npm/dt/express-easy-zip.svg)](https://www.npmjs.com/package/express-easy-zip)
[![Donate](https://img.shields.io/gratipay/user/tanhauhau.svg)](https://gratipay.com/~tanhauhau/)

> Zip files and folders easily for your express server. 
> Successor of [express-zip](https://www.npmjs.com/package/express-zip)

## Installation

```bash
npm install --save express-easy-zip
```

## Usage
```javascript
var express = require('express'),
        app = express(),
        zip = require('express-easy-zip');

//include zip
app.use(zip());

app.use('/zip', function(req, res){
    res.zip({
        files: [
            { content: 'this is a string',      //options can refer to [http://archiverjs.com/zip-stream/ZipStream.html#entry](http://archiverjs.com/zip-stream/ZipStream.html#entry)
                 name: 'file-name',
                 mode: 0755,
              comment: 'comment-for-the-file',
                 date: new Date(),
                 type: 'file' },
            { path: path.join(__dirname, './file'), name: 'any/path/to/file' }, //can be a file
            { path: path.join(__dirname, './folder/'), name: 'folder-name' }    //or a folder
        ],
        filename: 'zip-file-name.zip'
    });
});
```

## Documentation

See [Documentation](https://github.com/tanhauhau/express-easy-zip/blob/master/DOC.md).

## License

The MIT License (MIT)

Copyright (c) 2016 Tan Li Hau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
