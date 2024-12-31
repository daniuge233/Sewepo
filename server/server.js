const http = require("http");
const fs = require('fs');
const apis = require("./utility/apis");

var data = fs.readFileSync("server/data/data.json");
data = JSON.parse(data);
function getData() {
    return data;
}

var server = http.createServer(function(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const url = req.url;

    if (url.startsWith("/api")) {
        data = fs.readFileSync("server/data/data.json");
        data = JSON.parse(data);
        apis.Process(req, res, getData);
        return;
    }

    if (url.startsWith("/index.html") || url.startsWith("/css") || url.startsWith("/js")) {
        var filePath = '.' + url;
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    fs.readFile("server/" + url, (err, resp) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text' });
        res.end(resp);
    })
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log("Server listening on: 127.0.0.1:" + PORT);
});