function GetCalendar(getData) {
    let calendar = getData().calendar;
    let _calendar = JSON.stringify(calendar);
    return _calendar;
}

module.exports = { GetCalendar }