require('doff.core.project', 'get_settings', 'get_project');
var settings = get_settings();
var project = get_project();

function offline(request) {
    return {'OFFLINE': true};
}

publish({
    offline: offline
});