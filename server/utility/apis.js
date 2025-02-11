const URL = require('url');

const ImageAPIs = require('./functions/ImageAPIs');
const SystemAPIs = require('./functions/systemAPIs');
const CalendarAPIs = require('./functions/calendarAPIs');
const WeatherAPIs = require('./functions/weatherAPIs');

function Process(req, res, getData) {
    const _url = req.url;
    var parameters = URL.parse(_url ,true).query;
    // 去除参数
    const url = _url.replace(/\?.*$/, '');
    if (url.indexOf("?") != -1) {
        url = url.replace(/(\?|#)[^'"]*/, '');
    }

    // 获取图片API
    if (url == "/api/getImage") {
        // res.writeHead(200, { 'Content-Type': 'image' });
        // res.end(GetImage(getData));
        ImageAPIs.GetImage(getData, res)

    // API状态
    // 如果上次获取的图片属于API图片，则返回"true"，否则返回"false"
    } else if (url == "/api/getImageAPIStat") {
        res.writeHead(200, {'Content-Type': 'text'});
        res.end(ImageAPIs.GetImageAPIStat());
    
    // 缓存图片
    } else if (url == "/api/cacheImage") {
        res.writeHead(200, {'Content-Type': 'text'});
        if (ImageAPIs.CacheImage(getData) == -1) {
            res.end("error");
        } else {
            res.end("finish");
        }

    // 关机函数
    // 仅对Windows系统有效
    } else if (url == "/api/shutdown") {
        SystemAPIs.ShutDown();

    // 检查图片存在性
    } else if (url == "/api/checkImage") {
        if (parameters["id"] != undefined && parameters["id"] != null) {
            res.writeHead(200, {'Content-Type': 'text'});
            res.end(ImageAPIs.CheckImage(parameters["id"], getData));
        } else {
            res.writeHead(200, {'Content-Type': 'text'});
            res.end('error');
        }

    // 获取课表
    } else if (url == "/api/getCalendar") {
        res.writeHead(200, { 'Content-Type': 'text', 'Charset': 'UTF-8' });
        res.end(CalendarAPIs.GetCalendar(getData));

    // 获取天气
    } else if (url == "/api/getWeather") {
        WeatherAPIs.GetWeather(getData, res);
    
    // 获取标志
    } else if (url == "/api/getWeatherIcon") {
        if (parameters["weather"] != undefined && parameters["weather"] != null) {
            res.writeHead(200, {'Content-Type': 'text'});
            res.end(WeatherAPIs.GetWeatherIcon(getData, parameters["weather"]));
        } else {
            res.writeHead(200, {'Content-Type': 'text'});
            res.end('error');
        }
    }
}

module.exports = { Process };