var now;        // 当前的Date对象
var cur;        // 当前秒数

// 课表容器
var container;
var subject_elems = [];
var calendarToday;
var timetableToday;

// 时间
var dater;
var timer;

// 天气
var weather_icon;
var weatherer;
var weatherDay;
var weatherother;

// data中的数据解析后的对象
var data_obj;

// 天气更新倒计时
var WeatherUpdateCountDown = -2;
var WeatherCur = 0;
// 今日天气数据
var temp_today, high_today, low_today, rain_today;
// 明日天气数据
var temp_tomorrow, high_tomorrow, low_tomorrow, rain_tomorrow;

$(document).ready(function () {
    now = new Date();

    InitObjects();
    InitCalendar();

    GeneralUpdate();
})

function InitObjects() {
    container = document.getElementById("calendar_container");

    timer = document.getElementsByClassName("timer")[0];
    dater = document.getElementsByClassName("dater")[0];

    weather_icon = document.getElementById("weather-icon");
    weatherer = document.getElementsByClassName("weatherer")[0];
    weatherDay = document.getElementsByClassName("day")[0];
    weatherother = document.getElementsByClassName("weatherother")[0]
}

function InitCalendar() {
    $.get("http://localhost:8080/api/getCalendar", function(res) {
        data_obj = jQuery.parseJSON(res);

        calendarToday = data_obj.classes[DoW.toString()];
        
        if (DoW != 6 && DoW != 7) {
            timetableToday = data_obj.times_normal;
        } else {
            timetableToday = data_obj.times_weekends;
        }

        for (var i = 0; i < calendarToday.length; i++){
            let _class = document.createElement("span");
            _class.id = "subject";
            _class.classList.add("subj_" + i.toString());
            _class.classList.add("subject_normal");
            _class.innerHTML = calendarToday[i];
            container.appendChild(_class);
            subject_elems[i] = _class;
        }
    })
}

setInterval(() => {
    now = new Date();
    cur = getSecondsOfDay(now);

    WeatherUpdateCountDown += 1;

    UpdateTime();
    UpdateCalendar();
    // 每隔20秒切换一次今/明天天气
    if (WeatherUpdateCountDown >= 10 || WeatherUpdateCountDown == -1) {
        UpdateWeather(WeatherCur);
        WeatherCur == 1 ? WeatherCur = 0 : WeatherCur = 1;
        WeatherUpdateCountDown = 0
    }
    UpdateShutDown();
}, 1000);

function GeneralUpdate() {
    GetWeather();
    UpdateTime();
    UpdateCalendar();
    SetBackground();
}

function GetWeather() {
    $.get("http://localhost:8080/api/getWeather", function (res) {
        let dat = jQuery.parseJSON(res);

        temp_today = dat[0].temp, low_today = dat[0].low, high_today = dat[0].high, rain_today = dat[0].rainfall;
        temp_tomorrow = dat[1].temp, low_tomorrow = dat[1].low, high_tomorrow = dat[1].high, rain_tomorrow = dat[1].rainfall;

        console.log(temp_today, low_today, high_today, rain_today);
        console.log(temp_tomorrow, low_tomorrow, high_tomorrow, rain_tomorrow);
    })
}

function UpdateWeather(day) {
    switch(day) {
        case 0:
            weatherer.innerHTML = temp_today;
            weatherDay.innerHTML = "今天";
            weatherother.innerHTML = `${low_today} ~ ${high_today} ｜ ${rain_today}`;
            $.get("http://localhost:8080/api/getWeatherIcon?weather=" + temp_today, function (res) {
                document.getElementById("weather-icon").classList = [res];
            })
            break;

        case 1:
            weatherer.innerHTML = temp_tomorrow;
            weatherDay.innerHTML = "明天";
            weatherother.innerHTML = `${low_tomorrow} ~ ${high_tomorrow} ｜ ${rain_tomorrow}`;
            $.get("http://localhost:8080/api/getWeatherIcon?weather=" + temp_tomorrow, function (res) {
                document.getElementById("weather-icon").classList = [res];
            })
            break;
        default:
            weatherer.innerHTML = temp_today;
            weatherother.innerHTML = `${low_today} ~ ${high_today} ｜ ${rain_today}`;
            weatherDay.innerHTML = "今天";
            $.get("http://localhost:8080/api/getWeatherIcon?weather=" + temp_today, function (res) {
                document.getElementById("weather-icon").classList = [res];
            })
            break;
    }
}

function UpdateTime() {
    dater.innerHTML = formatDate(now);
    timer.innerHTML = formatTime(now);
}

// 更新当前的课程
function UpdateCalendar() {
    for (let i = 0; i < subject_elems.length; i++) {
        // 当前这节课的上课时间和下节课的上课时间
        let time_cur = timetableToday[i], time_next = timetableToday[i + 1];
        if (time_next == null || time_next == undefined) time_next = 2147483647;

        // console.log(time_cur, time_next, cur);

        // 如果这节课处于上课状态
        if (cur >= time_cur && cur <= time_next) {
            subject_elems[i].classList.remove("subject_normal");
            subject_elems[i].classList.add("subject_selected");
            break;

        // 如果下课
        } else {
            subject_elems[i].classList.remove("subject_selected");
            subject_elems[i].classList.add("subject_normal");
            continue;
        }
    }
}

function UpdateShutDown() {
    if (cur >= 79200 && cur < 79210) {
        $.get("http://localhost:8080/api/shutdown");
    }
    if (DoW == 6 || DoW == 7) {
        if (cur >= 42600 && cur < 42610) {
            $.get("http://localhost:8080/api/shutdown");
        }
    }
    if (DoW != 6 && DoW != 7) {
        if (cur >= 44400 && cur < 44410) {
            $.get("http://localhost:8080/api/shutdown");
        }
    }
}