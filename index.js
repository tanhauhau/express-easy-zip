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


            function addFilePath(filepath, opt, cb){
                try{
                    //check if file exists or not
                    var stat = fs.statSync(filepath);
                    //TODO read directory as well
                    if(stat.isFile()){
                        //if it is a file
                        zip.entry(fs.createReadStream(filepath), opt, cb);
                    }else{
                        //if it is a directory
                        var files = readDir(filepath);
                        each(files, function iteratee(file, ecb) {
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
                            zip.entry(fs.createReadStream(path.join(filepath, file)), childOpt, ecb);
                        }, cb);
                    }
                }catch(e){
                    //if not exists
                    throw new ZIPError();
                }
            }
            function addFileContent(data, opt, cb){
                data = clean.cleanOnlyString(data);
                if(data !== undefined){
                    zip.entry(data, opt, cb);
                }else{
                    throw new ZIPError();
                }
            }
            function addFile(file, cb) {
                var fileOpt = {};
                fileOpt.name = clean.cleanOnlyString(file.name) || "noname";
                fileOpt.comment = clean.cleanOnlyString(file.comment) || "";
                fileOpt.date = file.date;
                fileOpt.mode = file.mode;
                fileOpt.type = file.type;

                try{
                    if (file.path !== undefined){
                        addFilePath(file.path, fileOpt, cb);
                    }else{
                        addFileContent(file.content, fileOpt, cb);
                    }
                }catch(e){
                    if(e instanceof ZIPError){
                        e = new Ignored(file);
                    }
                    cb(e);
                }
            }
            each(opt.files, addFile, function(err, ignored) {
                zip.finalize();
                _this.end();
                if (err instanceof Array && err.length > 0) return reject(err);
                resolve({ size: zip.getBytesWritten(), ignored: ignored });
            });
        });
    };
    next();
};

function each(arr, iter, cb){
    var index = 0, len = arr.length;
    var result = [];
    var e = [];
    function ccb(err, data){
        if(err){
            if(err instanceof Ignored){
                result.push(err.file);
            }else if(err instanceof Array){
                for(var i=0; i<err.length; i++){
                    e.push(err[i]);
                }
            }else{
                e.push(err);
            }
        }
        if(++index < len){
            iter(arr[index], ccb);
        }else{
            cb(e, result);
        }
    }
    iter(arr[index], ccb);
}

exports = module.exports = function(){ return ZIP };
