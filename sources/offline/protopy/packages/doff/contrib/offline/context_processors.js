require('doff.core.project', 'get_project');
require('doff.conf.settings', 'settings');

function offline(request) {
    return {'offline': true};
}

publish({
    offline: offline
});