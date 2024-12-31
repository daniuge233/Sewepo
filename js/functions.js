var bucket = ['', 'Mon.', 'Tues.', 'Wed.', 'Thurs.', 'Fri.', 'Sat.', 'Sun.'];
var DoW = getDayOfWeek(new Date());

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}年${month}月${day}日 (${bucket[DoW]})`;
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