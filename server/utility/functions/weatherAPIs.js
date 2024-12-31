const axios = require('axios');

function GetWeather(res) {
    requestWeather("http://node.api.xfabe.com/api/weather/get?city=济南", function (data) {
        res.writeHead(200, { 'Content-Type': 'text', 'Charset': 'UTF-8' });
        res.end(JSON.stringify(data));
    })
}

function GetWeatherIcon(getData, weather) {
    var res = getData().weather_bucket[weather];
    if (res == undefined || res == null) {
        return "error";
    }
    return "qi-" + getData().weather_bucket[weather];
}

async function requestWeather(url, callback) {
    axios.get(url, { maxRedirects: 5 })
        .then(response => {
            console.log(response.data.data.weather[0]);
            callback(response.data.data.weather[0]);
        }).catch((error) => {
            console.log(error);
        })
}

module.exports = { GetWeather, GetWeatherIcon }