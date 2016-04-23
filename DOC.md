# express-easy-zip

`express-easy-zip` is built upon [zip-stream](https://www.npmjs.com/package/zip-stream).

It was originally created to be a successor to [express-zip](https://www.npmjs.com/package/express-zip).

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

## zip()
This creates a middleware to be used in express via `app.use(zip())` to add the `.zip(opts)` function to the `res` object.

## res.zip(opts)

The `res` object represents the HTTP response that an Express app sends when it gets an HTTP request.
This will send a zip file as the HTTP response.

This function will set the following HTTP response header:

* Content-Type: `application/zip`
* Content-Disposition: `attachment; filename="filename"`

**Parameters**:

* `options`: Object
	
	***Properties***
	
	Name | Type | Default | Description
	---|---|---|---
	path | String |  | Either `path` or `content` **must be set**. <br>The path of the file or folder to be included into the zip.
	content | String | | Either `path` or `content` **must be set**. <br>The string content of the file to be included into the zip.
	name | String | 'noname' | **Required**<br> Sets the entry name including internal path.
	comment | String | '' | **Optional**<br> Sets the entry comment.
	date | String or Date | NOW() | **Optional**<br>Sets the entry date.
	mode | Number | D:0755/F:0644	 | **Optional**<br>Sets the entry permissions.
	type | String | 'file' | **Optional**<br>Sets the entry type. Defaults to directory if name ends with trailing slash.
	
	Most of the options come from here: [ZipStream#entry](http://archiverjs.com/zip-stream/ZipStream.html#entry)
	
**Returns**:

A [ES6 Promise](https://www.npmjs.com/package/es6-promise) when resolved returns a object.

The object contains the following properties:

Name | Type | Description
---|---|---
size | Number | The size in bytes of the zip file sent in the response
ignored | Array | Array contains file that is ignored in the zip file. The reason of ignoring the file is that the file path given for the file does not exists.<br> The array contains file object given in the option `opts.files`.

Example:

```javascript
res.zip({ ... })
.then(function(obj){
	var zipFileSizeInBytes = obj.size;
	var ignoredFileArray = obj.ignored;
})
.catch(function(err){
	console.log(err);	//if zip failed
});
```