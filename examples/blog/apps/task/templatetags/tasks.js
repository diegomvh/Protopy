require('doff.template.base', 'Library');

function getFirstDay(theYear, theMonth) {
    var firstDate = new Date(theYear,theMonth,1);
    return firstDate.getDay();
}

function getMonthLen(theYear, theMonth) {
    var nextMonth = new Date(theYear, theMonth + 1, 1);
    nextMonth.setHours(nextMonth.getHours() - 3);
    return nextMonth.getDate();
}

var register = new Library();

function calendar() {
    var today = new Date();
    var firstDay = getFirstDay(today.getFullYear(), today.getMonth());
    var howMany = getMonthLen(today.getFullYear(), today.getMonth());

    return { 'today': today, 'firstDay': firstDay, 'howMany': howMany };
}
register.inclusion_tag("calendar.html")(calendar);

publish({
    register: register
});