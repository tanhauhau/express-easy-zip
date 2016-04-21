var   async = require('async'),
    express = require('express'),
         fs = require('fs'),
       path = require('path'),
     packer = require('zip-stream'),
      clean = require('var-clean').clean,
    readDir = require('fs-readdir-recursive')
    Promise = require("bluebird");

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
                        async.eachSeries(files, function iteratee(file, cb) {
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
                            zip.entry(fs.createReadStream(path.join(filepath, file)), childOpt, cb);
                        }, function(err){
                            cb(err);
                        });
                    }
                }catch(e){
                    //if not exists
                    console.warn('Ignore file: ' + filepath);
                    cb();
                }
            }
            function addFileContent(data, opt, cb){
                data = clean.cleanOnlyString(data);
                if(data !== undefined){
                    zip.entry(data, opt, cb);
                }else{
                    console.warn('Ignore content: ' + data);
                    cb();
                }
            }
            function addFile(file, cb) {
                var fileOpt = {};
                fileOpt.name = clean.cleanOnlyString(file.name) || "noname";
                fileOpt.comment = clean.cleanOnlyString(file.comment) || "";
                fileOpt.date = file.date;
                fileOpt.mode = file.mode;
                fileOpt.type = file.type;

                if (file.path !== undefined){
                    addFilePath(file.path, fileOpt, cb);
                }else{
                    addFileContent(file.content, fileOpt, cb);
                }
            }

            async.eachSeries(opt.files, addFile, function(err, ignored) {
                if (err) return reject(err);
                zip.finalize();
                resolve(zip.getBytesWritten());
            });

        });
    };
    next();
};
exports = module.exports = function(){ return ZIP };
