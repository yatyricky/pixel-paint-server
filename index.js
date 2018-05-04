const config = require("./config");
const fs = require("fs");
const archiver = require("archiver");
const https = require("https");
const path = require("path");
const express = require("express");
const app = express();
const MongoClient = require("mongodb").MongoClient;

https.createServer({
    key: fs.readFileSync("/etc/letsencrypt/live/g.nefti.me/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/g.nefti.me/fullchain.pem")
}, app).listen(config.PORT, () => {
    console.log(`--- server running on ${config.PORT} ---`);
});

const files = [];
fs.readdirSync("./files").map(file => {
    files.push(file.split(".")[0]);
});

app.use(express.static(path.join(__dirname, "/public")));
app.use((req, res, next) => {
    if (req.query.hasOwnProperty("secret")) {
        if (req.query["secret"] == config.SECRET) {
            next();
        } else {
            console.log("wrong secret");
            res.status(404).send("Not found");
        }
    } else {
        console.log("no secret");
        res.status(404).send("Not found");
    }
});

app.get("/getsome", (req, res) => {
    if (req.query.hasOwnProperty("list")) {
        const has = req.query["list"].split(",");
        let count = 0;
        const selection = [];
        for (let i = 0; i < files.length; i++) {
            if (has.indexOf(files[i]) == -1 && count < config.MAX_FILES) {
                selection.push(files[i] + ".json");
                count += 1;
            }
        }

        if (selection.length > 0) {
            const fos = fs.createWriteStream("bulk.zip");
            const archive = archiver("zip");

            fos.on("close", () => {
                console.log(archive.pointer() + " total bytes");
                console.log("archiver has been finalized and the output file descriptor has closed.");
                res.status(200).sendFile(path.join(__dirname, "bulk.zip"));
            });

            archive.on("error", (err) => {
                console.log(err);
                res.status(500).send("archive failed");
            });

            archive.pipe(fos);
            console.log(`Request List = ${req.query["list"]}`);

            for (let i = 0; i < selection.length; i++) {
                archive.file(path.join("files", selection[i]), {
                    name: selection[i]
                });
            }
            archive.finalize();
        } else {
            console.log("No more updates");
            res.status(201).send("No more");
        }
    } else {
        console.log("no list");
        res.status(400).send("bad request");
    }
});

app.get("/vortex", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, "/web/index.html"));
});

app.get("/list", (req, res) => {
    res.status(200).send(files);
});

app.get("/getdata", (req, res) => {
    if (req.query.hasOwnProperty("name")) {
        MongoClient.connect("mongodb://localhost:27017/", (err, db) => {
            if (err) {
                res.status(500).send(`Internal error ${JSON.stringify(err)}`);
            } else {
                db.db("pixels").collection("filedata").find({
                    name: req.query.name
                }).toArray((err, dbres) => {
                    if (err) {
                        res.status(500).send(`Internal error ${JSON.stringify(err)}`);
                    } else {
                        if (dbres.length == 1) {
                            let loves = dbres[0].loves;
                            if (loves === undefined) {
                                loves = 0;
                            }
                            res.status(200).send({
                                tags: dbres[0].tags,
                                loves: loves
                            });
                        } else if (dbres.length == 0) {
                            res.status(200).send({
                                tags: [],
                                loves: 0
                            });
                        } else {
                            res.status(201).send(`Warning: duplicated ${req.query.name}`);
                        }
                        db.close();
                    }
                });
            }
        });
    } else {
        res.status(400).send("Bad request: no name received");
    }
});

app.get("/update", (req, res) => {
    if (req.query.hasOwnProperty("name") && req.query.hasOwnProperty("tags") && req.query.hasOwnProperty("loves")) {
        MongoClient.connect("mongodb://localhost:27017/", (err, db) => {
            if (err) {
                res.status(500).send(`Internal error ${JSON.stringify(err)}`);
            } else {
                db.db("pixels").collection("filedata").updateOne(
                    {
                        name: req.query.name
                    }, {
                        $set: {
                            name: req.query.name,
                            tags: req.query.tags.split(","),
                            loves: parseInt(req.query.loves)
                        }
                    }, {
                        upsert: true
                    }, (err, dbres) => {
                        if (err) {
                            res.status(500).send(`Internal error ${JSON.stringify(err)}`);
                        } else {
                            db.close();
                            res.status(200).send("Upsert OK");
                        }
                    }
                );
            }
        });
    } else {
        res.status(400).send("Bad request: no name and tags received");
    }
});

app.get("/love", (req, res) => {
    if (req.query.hasOwnProperty("name") && req.query.hasOwnProperty("num")) {
        MongoClient.connect("mongodb://localhost:27017/", (err, db) => {
            if (err) {
                res.status(500).send(`Internal error ${JSON.stringify(err)}`);
            } else {
                db.db("pixels").collection("filedata").updateOne(
                    {
                        name: req.query.name
                    }, {
                        $inc: {
                            loves: parseInt(req.query.num)
                        }
                    }, (err, dbres) => {
                        if (err) {
                            res.status(500).send(`Internal error ${JSON.stringify(err)}`);
                        } else {
                            db.close();
                            res.status(200).send("Upsert OK");
                        }
                    }
                );
            }
        });
    } else {
        res.status(400).send("Bad request: no name and tags received");
    }
});

app.get("*", (req, res) => {
    console.log(`Uncaught path: ${req.originalUrl}`);
    res.status(404).send("Not found");
});