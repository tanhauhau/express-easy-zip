var express = require('express');
var zip = require('../index.js');
var path = require('path');

app = express();
app.use(zip());

app.get('/test/1', function(req, res) {
  res.zip({
    files: [
      { content: 'this is a string', name: 'file-name' }
    ],
    filename: 'test1.zip'
  });
});

app.get('/test/2', function(req, res) {
  res.zip({
    files: [
      { path: path.join(__dirname, './test/test1.txt'), name: 'test1.txt' },
      { path: path.join(__dirname, './test/test2.txt'), name: 'super/long/path/test2.txt' },
      { content: 'this is a string', name: 'test3.txt' },
      { path: path.join(__dirname, './test/folder'), name: 'folder' }
    ],
    filename: 'test2.zip'
  });
});


var server = app.listen(8888);

exports.closeServer = function() {
  server.close();
};
