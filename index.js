const config = require('./config');
const fs = require('fs');
const archiver = require('archiver');
const https = require('https');
const path = require('path');
const app = require('express')();

https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/g.nefti.me/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/g.nefti.me/fullchain.pem')
}, app).listen(config.PORT, () => {
    console.log(`--- server running on ${config.PORT} ---`);
});

const files = [];
fs.readdirSync('./files').map(file => {
    files.push(file.split('.')[0]);
});

app.get("/", (req, res) => {
    if (req.query.hasOwnProperty("secret")) {
        if (req.query["secret"] == config.SECRET) {
            if (req.query.hasOwnProperty("list")) {
                const fos = fs.createWriteStream('bulk.zip');
                const archive = archiver('zip');

                fos.on('close', () => {
                    console.log(archive.pointer() + ' total bytes');
                    console.log('archiver has been finalized and the output file descriptor has closed.');
                    res.status(200).sendFile(path.join(__dirname, 'bulk.zip'));
                });
                
                archive.on('error', (err) => {
                    console.log(err);
                    res.status(201).send('failed');
                });
                
                archive.pipe(fos);
                const has = req.query["list"].split(",");
                console.log(`Request List = ${req.query["list"]}`);
                
                let count = 0;
                for (let i = 0; i < files.length; i++) {
                    if (has.indexOf(files[i]) == -1 && count < config.MAX_FILES) {
                        fn = files[i] + ".json";
                        archive.file(path.join('files', fn), {
                            name: fn
                        });
                        count += 1;
                    }
                }
                archive.finalize();
            } else {
                console.log('no list');
                res.status(400).send('bad request');
            }
        } else {
            console.log('wrong secret');
            res.status(400).send('bad request');
        }
    } else {
        console.log('no secret');
        res.status(400).send('bad request');
    }
});