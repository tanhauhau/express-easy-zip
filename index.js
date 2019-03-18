var fs = require('fs');
var exists = require('file-exists-promise');
var path = require('path');
var packer = require('zip-stream');
var clean = require('var-clean').clean;
var readDir = require('fs-readdir-recursive');
var Promise = require('es6-promise').Promise;

function ZIPError() {}

ZIPError.prototype = Object.create(Error.prototype);

function Ignored(obj) {
  this.file = obj;
}

Ignored.prototype.constructor = Ignored;

function ZIPResult(err, ignored) {
  this.err = err;
  this.ignored = ignored;
}

ZIPResult.prototype.constructor = ZIPResult;

function zipEntry(zip, dat, opt) {
  return new Promise(function(resolve, reject) {
    zip.entry(dat, opt, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function _ZIP(opt) {
  var _this = this;
  return new Promise(function(resolve, reject) {
    opt = opt || {};
    opt.filename = clean.cleanOnlyString(opt.filename) || 'attachment.zip';
    opt.files = opt.files || [];

    _this.header('Content-Type', 'application/zip');
    _this.header('Content-Disposition', 'attachment; filename="' + opt.filename + '"');

    var zip = new packer();
    zip.pipe(_this); // res is a writable stream

    function addFilePath(filepath, opt) {
      return new Promise(function(resolve, reject) {
        //check if file exists or not
        exists(filepath)
          .then(function(stat) {
            try {
              if (stat.isFile()) {
                //if it is a file
                zipEntry(zip, fs.createReadStream(filepath), opt)
                  .then(resolve, reject);
              } else {
                //if it is a directory
                var files = readDir(filepath);
                each(files, function iteratee(file) {
                  var childOpt = {
                    name: path.join(opt.name, file),
                    comment: opt.comment,
                    date: opt.date,
                    mode: opt.mode,
                    type: opt.type
                  };
                  return addFilePath(path.join(filepath, file), childOpt);
                }).then(resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          }, function() { //if not exists
            return reject(new ZIPError());
          });
      });
    }

    function addFileContent(data, opt) {
      return new Promise(function(resolve, reject) {
        data = clean.cleanOnlyString(data);
        if (data !== undefined) {
          zipEntry(zip, data, opt)
            .then(resolve, reject);
        } else {
          reject(new ZIPError());
        }

      });
    }

    function addFile(file) {
      return new Promise(function(resolve, reject) {
        var fileOpt = {
          name: clean.cleanOnlyString(file.name) || 'noname',
          comment: clean.cleanOnlyString(file.comment) || '',
          date: file.date,
          mode: file.mode,
          type: file.type
        };
        var promise = (file.path !== undefined) ?
          addFilePath(file.path, fileOpt) :
          addFileContent(file.content, fileOpt);

        promise.then(resolve, function(e) {
          if (e instanceof ZIPError) {
            e = new Ignored(file);
          }
          reject(e);
        });
      });
    }

    each(opt.files, addFile)
      .then(function(data) {
        zip.finalize();
        if (data.err instanceof Array && data.err.length > 0) {
          reject(data.err);
        } else {
          resolve({ size: zip.getBytesWritten(), ignored: data.ignored });
        }
      }, function(err) {
        _this.sendStatus(500);
        reject(err);
      });
  });
}

function ZIP(req, res, next) {
  res.zip = _ZIP;
  next();
}

function each(arr, iter) {
  var result = [], e = [];

  function goodPromise(promise) {
    return new Promise(function(resolve) {
      promise.then(function(data) {
        if (data instanceof ZIPResult) {
          //add to the array
          Array.prototype.push.apply(e, data.err);
          Array.prototype.push.apply(result, data.ignored);
        }
        resolve();
      }, function(err) {
        if (err instanceof Ignored) {
          result.push(err.file);
        } else {
          e.push(err);
        }
        resolve();
      });
    });
  }

  var ready = Promise.resolve(null);

  arr.forEach(function(file) {
    ready = ready.then(function() {
      return goodPromise(iter(file));
    });
  });

  return ready.then(function() { return Promise.resolve(new ZIPResult(e, result)); });
}

exports = module.exports = function() { return ZIP };
