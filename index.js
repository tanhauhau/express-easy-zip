var express = require('express'),
         fs = require('fs'),
       path = require('path'),
     packer = require('zip-stream'),
      clean = require('var-clean').clean,
    readDir = require('fs-readdir-recursive')
    Promise = require('es6-promise').Promise;

function ZIPError() {
    this.name = 'ZIPError';
    this.message = 'File or Content not found';
    this.stack = (new Error()).stack;
}
ZIPError.prototype = Object.create(Error.prototype);
ZIPError.prototype.constructor = ZIPError;

function Ignored(obj){
    this.file = obj;
}
Ignored.prototype.constructor = Ignored;

function ZIPResult(err, ignored){
    this.err = err;
    this.ignored = ignored;
}
ZIPResult.prototype.constructor = ZIPResult;

function ZIP(req, res, next){
    res.zip = function(opt) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            opt = opt || {};
            opt.filename = clean.cleanOnlyString(opt.filename) || "attachment.zip";
            opt.files = opt.files || [];

            _this.header('Content-Type', 'application/zip');
            _this.header('Content-Disposition', 'attachment; filename="' + opt.filename + '"');

            var zip = new packer();
            zip.pipe(_this); // res is a writable stream


            function addFilePath(filepath, opt){
                return new Promise(function(resolve, reject){
                    //check if file exists or not
                    fs.stat(filepath, function(err, stat){
                        if(err){ //if not exists
                            return reject(new ZIPError());
                        }
                        try{
                            if(stat.isFile()){
                                //if it is a file
                                zip.entry(fs.createReadStream(filepath), opt, function(err, data){
                                    if(err) reject(err);
                                    else    resolve(data);
                                });
                            }else{
                                //if it is a directory
                                var files = readDir(filepath);
                                each(files, function iteratee(file) {
                                    return new Promise(function(fileResolve, fileReject){
                                        //extend
                                        var childOpt = {};
                                        childOpt.name = opt.name;
                                        childOpt.comment = opt.comment;
                                        childOpt.date = opt.date;
                                        childOpt.mode = opt.mode;
                                        childOpt.type = opt.type;
                                        //update name
                                        childOpt.name = (childOpt.name.slice(-1) === "/") ? childOpt.name : childOpt.name + "/";
                                        childOpt.name += file;
                                        //add to zip
                                        zip.entry(fs.createReadStream(path.join(filepath, file)), childOpt, function(err, data){
                                            if(err) fileReject(err);
                                            else    fileResolve(data);
                                        });
                                    });
                                }).then(resolve, reject);
                            }
                        }catch(e){
                            reject(e);
                        }
                    });
                });
            }
            function addFileContent(data, opt){
                return new Promise(function(resolve, reject){
                    data = clean.cleanOnlyString(data);
                    if(data !== undefined){
                        zip.entry(data, opt, function(err, data){
                            if(err) reject(err);
                            else    resolve(data);
                        });
                    }else{
                        reject(new ZIPError());
                    }

                });
            }
            function addFile(file) {
                return new Promise(function(resolve, reject){
                    var fileOpt = {};
                    fileOpt.name = clean.cleanOnlyString(file.name) || "noname";
                    fileOpt.comment = clean.cleanOnlyString(file.comment) || "";
                    fileOpt.date = file.date;
                    fileOpt.mode = file.mode;
                    fileOpt.type = file.type;

                    var promise;
                    if (file.path !== undefined){
                        promise = addFilePath(file.path, fileOpt);
                    }else{
                        promise = addFileContent(file.content, fileOpt);
                    }
                    promise.then(function(data){
                        resolve(data);
                    }, function(e){
                        if(e instanceof ZIPError){
                            e = new Ignored(file);
                        }
                        reject(e);
                    });
                });
            }
            each(opt.files, addFile)
            .then(function(data){
                zip.finalize();
                _this.end();
                var err = data.err;
                if (err instanceof Array && err.length > 0) return reject(err);
                resolve({ size: zip.getBytesWritten(), ignored: data.ignored });
            }, function(err) {
                reject(err);
            });
        });
    };
    next();
};

function each(arr, iter){
    var result = [];
    var e = [];
    function goodPromise(promise){
        return new Promise(function(resolve){
            promise.then(function(data){
                if(data instanceof ZIPResult){
                    for(var i=0; i<data.err.length; i++){
                        e.push(data.err[i]);
                    }
                    for(var i=0; i<data.ignored.length; i++){
                        result.push(data.ignored[i]);
                    }
                }
                resolve();
            }, function (err){
                if(err instanceof Ignored){
                    result.push(err.file);
                }else{
                    e.push(err);
                }
                resolve();
            });
        });
    }
    var ready = Promise.resolve(null);


    for(var i=0; i<arr.length; i++){
        (function(file){
            ready = ready.then(function(){
                return goodPromise(iter(file));
            });
        })(arr[i]);
    }
    return ready.then(function(){ return Promise.resolve(new ZIPResult(e, result)); });
}

exports = module.exports = function(){ return ZIP };
