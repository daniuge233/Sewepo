// 浏览器跨域访问限制，必须把数据存储在代码中，不然就得开服务器
// 懒得做服务器了()
const data = '{"classes":{"1":["语","数","生","化","历","英","体","班","活"],"2":["英","物","数","数","语","地","政","美","活"],"3":["英","数","语","物","化","心","信","自","自"],"4":["英","语","数","音","通","体","生","历","自"],"5":["数","英","化","政","地","语","物","自","自"],"6":["英","英","数","数","物","化","自","活"],"7":["地","历","语","语","生","政","自","活"]},"times_normal":[27000,30000,34800,37800,40800,49800,52800,57300,60300],"times_weekends":[27600,31200,34800,38400,49800,53400,57000,60600]}';

const classes_normal = 9;
const classes_weekends = 8;

var countdown;      // 时间
var now;        // 当前的Date对象
var subject_elems = [];     // 课表对象

var bucket = ['', '一', '二', '三', '四', '五', '六', '日'];

// data中的数据解析后的对象
var data_obj;

// Day of Week, 今天的星期
var DoW = getDayOfWeek(new Date());

window.onload = function () {
    countdown = document.getElementById("cd");
    for (let i = 1; i <= classes_normal; i++) {
        subject_elems[i - 1] = document.getElementsByClassName(`subj_${i}`)[0];
    }

    // 初始化课表
    now = new Date();
    data_obj = jQuery.parseJSON(data);
    let calendar = data_obj.classes[DoW.toString()];
    if (DoW != 6 && DoW != 7) {
        for (let i = 0; i < classes_normal; i++) {
            subject_elems[i].innerHTML = calendar[i];
        }
    } else {
        subject_elems[0].remove();
        for (let i = 0; i < classes_weekends; i++) {
            subject_elems[i + 1].innerHTML = calendar[i];
        }
    }
}

// 获取天气
$(document).ready(function () {
    $.get("https://node.api.xfabe.com/api/weather/get?city=济南", function (res) {
        let weather = res.data.weather;
        console.log(weather);
        let temp = weather[0]["temp"];
        let high = weather[0]["high"];
        let low = weather[0]["low"];
        let rainfall = weather[0]["rainfall"];
        let humidity = weather[0]["humidity"];

        let text = "天气:" + temp + " ｜ 气温:" + low + "~" + high + " ｜ 预计降水:" + rainfall + " ｜ 湿度:" + humidity;
        document.getElementById("weather").innerHTML = text;
    })
})

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const week = bucket[DoW];

    return `${year}年${month}月${day}日（星期${week}） ${hours}:${minutes}:${seconds}`;
}

function getSecondsOfDay(date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const secondsSinceStartOfDay = Math.floor((date - startOfDay) / 1000);

    return secondsSinceStartOfDay;
}

function getDayOfWeek(date) {
    const day = date.getDay();
    return day === 0 ? 7 : day;
}

setInterval(() => {
    now = new Date();
    countdown.innerHTML = formatDateTime(now);

    var cur = getSecondsOfDay(now);
    // var cur = document.getElementById("dbg").value;
    // console.log(cur);

    // console.log(DoW);

    if (DoW != 6 && DoW != 7) {
        for (let i = 0; i < classes_normal; i++) {
            let time = data_obj["times_normal"][i];
            var time_next;
            if (i <= 8) time_next = data_obj["times_normal"][i + 1];
            else time_next = 2147483647;

            // 如果未到达或已过下一个
            if (cur < time || cur >= time_next) {
                subject_elems[i].classList.remove("subject_selected");
                subject_elems[i].classList.add("subject_normal");
                continue;
            } else {
                subject_elems[i].classList.remove("subject_normal");
                subject_elems[i].classList.add("subject_selected")
                break;
            }
        }

    } else {
        for (let i = 0; i < classes_weekends; i++) {
            let time = data_obj["times_weekends"][i];
            var time_next;
            if (i <= 7) time_next = data_obj["times_weekends"][i + 1];
            else time_next = 2147483647;

            // 如果未到达或已过下一个
            if (cur < time || cur >= time_next) {
                subject_elems[i + 1].classList.remove("subject_selected");
                subject_elems[i + 1].classList.add("subject_normal");
                continue;
            } else {
                subject_elems[i + 1].classList.remove("subject_normal");
                subject_elems[i + 1].classList.add("subject_selected")
                break;
            }
        }
    }
}, (1000));
