const fs = require('fs');
const axios = require('axios');
const path = require('path');

var api_img_data = null;
var api_stat = "false";

// 随机图片
function GetImage(getData, res) {
    const rand_base = Math.floor(getRandomArbitrary(0, 10));
    // const rand_base = 999;
    if (rand_base <= 5) {
        requestAPIimage('http://t.alcy.cc/fj/', function(data, file_name) {
            api_stat = '{"status" : "true", "id" : "' + file_name + '"}';
            api_img_data = data;
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(data);
        });
    } else {
        api_stat = '{"status" : "false", "id" : ""}';
        fs.readdir("server/data/images", (err, files) => {
            if (files.length <= 0) {
                requestAPIimage('http://t.alcy.cc/fj/', function(data, file_name) {
                    api_stat = '{"status" : "true", "id" : "' + file_name + '"}';
                    api_img_data = data;
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(data);
                });
                return;
            }
            
            let rand_id = Math.floor(getRandomArbitrary(0, files.length));
            let fileName = files[rand_id];
            let url = "http://localhost:8080/data/images/" + fileName;
            requestAPIimage(url, function(data) {
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(data);
            });
        });
    }
}

// 检查图片是否存在
// 存在true，不存在false
function CheckImage(id, getData) {
    let data = getData();
    if (data.API_IDs.indexOf(id) == -1) {
        return 'false';
    } else {
        return 'true';
    }
}

// 缓存图片
function CacheImage(getData) {
    if (api_img_data == undefined || api_img_data == null) return -1;

    var id = JSON.parse(api_stat).id;
    if (id == undefined || id == "undefined") return -1;

    const fPath = "server/data/cache/" + id;

    const dir = path.dirname(fPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFile(fPath, api_img_data, (err) => {
        if (err) return -1;
        else return 1;
    })

    let data = getData()
    data.API_IDs.push(id);
    fs.writeFile("server/data/data.json", JSON.stringify(data), (err) => {
        if (err) return -1
    }); 
}

// 获取图片状态
function GetImageAPIStat() {
    return api_stat;
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

// 异步下载图片
async function requestAPIimage(url, callback) {
    axios.get(url, { responseType: 'arraybuffer', maxRedirects: 5 })
    .then(response => {
        var file_name = response.headers["x-nos-object-name"];
        callback(response.data, file_name);
    }).catch((error) => {
        console.log(error);
    })
}

module.exports = { GetImage, CacheImage, CheckImage, GetImageAPIStat }