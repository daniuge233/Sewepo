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
var weatherother;

// data中的数据解析后的对象
var data_obj;

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

    UpdateTime();
    UpdateCalendar();
    UpdateShutDown();
}, 1000);

function GeneralUpdate() {
    UpdateWeather();
    UpdateTime();
    UpdateCalendar();
    SetBackground();
}

function UpdateWeather() {
    $.get("http://localhost:8080/api/getWeather", function (res) {
        let dat = jQuery.parseJSON(res);

        weatherer.innerHTML = dat.temp;
        weatherother.innerHTML = `${dat.low} ~ ${dat.high} | ${dat.rainfall}`;

        $.get("http://localhost:8080/api/getWeatherIcon?weather=" + dat.temp, function (res) {
            document.getElementById("weather-icon").classList = [res];
        })
    })

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