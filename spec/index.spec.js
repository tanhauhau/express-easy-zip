var   unzip = require('unzip'),
    express = require('express'),
       path = require('path'),
         fs = require('fs'),
       http = require('http'),
    Promise = require('es6-promise').Promise,
  fsCompare = require('fs-compare'),
     mkdirp = require('mkdirp'),
     rimraf = require('rimraf'),
     server = require('./server.js'),
        zip = require('../index.js');

describe("Works perfectly", function(){
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    afterEach(function(){
        rimraf.sync(path.resolve(__dirname, './download'));
    })
    it('should response valid headers', function(done){
        http.get('http://127.0.0.1:8888/test/1', function(res){
            expect(res.headers['content-type']).toMatch(/^application\/zip/);
            expect(res.headers['content-disposition']).toMatch(/^attachment; filename="test1.zip"/);
            done();
        });
    });

    it('should response valid headers', function(done){
        http.get('http://127.0.0.1:8888/test/2', function(res){
            expect(res.headers['content-type']).toMatch(/^application\/zip/);
            expect(res.headers['content-disposition']).toMatch(/^attachment; filename="test2.zip"/);
            done();
        });
    });

    it('should be able to unzip without failed', function(done) {
        mkdirp.sync(path.resolve(__dirname, './download'));
        var zipfile = path.resolve(__dirname, './download/zip.zip');
        var unzipfile = path.resolve(__dirname, './download/unzip');

        new Promise(function (resolve, reject) {
            http.get('http://127.0.0.1:8888/test/2', function(res){
                res.pipe(fs.createWriteStream(zipfile));
                res.on('end', resolve);
                res.on('error', reject);
            });
        }).then(function(){
            return new Promise(function(resolve, reject){
                var file = fs.createReadStream(zipfile);
                file.pipe(unzip.Extract({ path: unzipfile }))
                .on('close', resolve);
                file.on('error', reject);
            });
        }).then(function(){
            function fileContent(fileName) {
                return fs.readFileSync(fileName, 'utf-8');
            }
            function getFileStat(filename) {
                return function(){
                    return fs.statSync(filename);
                }
            }
            expect(getFileStat(path.resolve(__dirname, './download/unzip/test1.txt'))).not.toThrow();
            expect(getFileStat(path.resolve(__dirname, './download/unzip/super/long/path/test2.txt'))).not.toThrow();
            expect(getFileStat(path.resolve(__dirname, './download/unzip/test3.txt'))).not.toThrow();
            expect(getFileStat(path.resolve(__dirname, './download/unzip/folder'))).not.toThrow();
            expect(getFileStat(path.resolve(__dirname, './download/unzip/folder/test4.txt'))).not.toThrow();
            expect(getFileStat(path.resolve(__dirname, './download/unzip/folder/test5.txt'))).not.toThrow();

            expect(fsCompare.sync(fileContent,
                path.resolve(__dirname, './download/unzip/test1.txt'),
                path.resolve(__dirname, './test/test1.txt'))).toBe(0);
            expect(fsCompare.sync(fileContent,
                path.resolve(__dirname, './download/unzip/super/long/path/test2.txt'),
                path.resolve(__dirname, './test/test2.txt'))).toBe(0);
            expect(fsCompare.sync(fileContent,
                path.resolve(__dirname, './download/unzip/folder/test4.txt'),
                path.resolve(__dirname, './test/folder/test4.txt'))).toBe(0);
            expect(fsCompare.sync(fileContent,
                path.resolve(__dirname, './download/unzip/folder/test5.txt'),
                path.resolve(__dirname, './test/folder/test5.txt'))).toBe(0);

            expect(fs.readFileSync(path.resolve(__dirname, './download/unzip/test3.txt'))).toMatch(/^this is a string$/);

            return Promise.resolve();
        }).then(function(){
            done();
            server.closeServer();
        })
        .catch(function(err){
            console.log(err);
            expect(err).toBeUndefined();
            done();
            server.closeServer();
        });
    });

    it('should return a promise', function(done){
        var app = express(), server;
        app.use(zip());
        app.get('/test/3', function(req, res){
            var promise = res.zip({
                files: [
                    { content: 'this is a string', name: 'file-name'},
                    { path: path.join(__dirname, './test/test1.txt'), name: 'exists.txt' },
                    { path: path.join(__dirname, './test/missing.txt'), name: 'unknown.txt' },
                    { name: 'unknown2.txt' },
                ],
                filename: 'test1.zip'
            });

            expect(promise).not.toBeUndefined();
            expect(promise).toEqual(jasmine.any(Promise));

            if(promise instanceof Promise){
                promise.then(function(val){
                    //to be well-formed
                    expect(val).not.toBeUndefined();
                    expect(val).toEqual(jasmine.any(Object));
                    expect(val.size).not.toBeUndefined();
                    expect(val.size).toEqual(jasmine.any(Number));
                    expect(val.size).toBeGreaterThan(0);
                    expect(val.ignored).not.toBeUndefined();
                    expect(val.ignored).toEqual(jasmine.any(Array));

                    //to be correct
                    expect(val.ignored.length).toEqual(2);
                    expect(val.ignored[0]).toEqual({ path: path.join(__dirname, './test/missing.txt'), name: 'unknown.txt' });
                    expect(val.ignored[1]).toEqual({ name: 'unknown2.txt' });
                    done();
                    server.close();
                })
            }else{
                done();
                server.close();
            }
        });
        server = app.listen(8888);

        http.get('http://127.0.0.1:8888/test/3', function(res){
        });
    });
});
