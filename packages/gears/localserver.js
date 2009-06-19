require('sys');

if (!sys.browser.features.Gears) {
    alert('Google gears is not installed, please install from http://gears.google.com/, redirecting now.');
    window.location.href = 'http://gears.google.com/';
}

var localServer = google.gears.factory.create('beta.localserver');

function can_serve_locally(url) {
    return localServer.canServeLocally(url);
}

//TODO: Se puede explotar mucho mas este objeto
var ResourceStore = type ('ResourceStore', object, {
    _store: null,

    __init__: function(name, requiredCookie) {
	this._store = localServer.createStore(name, requiredCookie);
    },

    delete: function() {
	localServer.removeStore(this.name, this.required_cookie);
    },

    get name(){
	return this._store.name;
    },
    
    get required_cookie(){
	return this._store.requiredCookie;
    },

    get enabled(){
	return this._store.enabled;
    },

    set enabled( value ){
	this._store.enabled = value;
    },
   
    capture: function(urlOrUrlArray, completionCallback) {
	return this._store.capture(urlOrUrlArray, completionCallback);
    },
    
    abort_capture: function(captureId) {
	this._store.abortCapture(captureId);
    },

    remove: function(url) {
	this._store.remove(url);
    },

    rename: function(srcUrl, destUrl) {
	this._store.rename(srcUrl, destUrl);
    },
    
    copy: function(srcUrl, destUrl) {
	this._store.copy(srcUrl, destUrl);
    },
    
    is_captured: function(url) {
	return this._store.isCaptured(url);
    },

    capture_blob: function(blob, url, optContentType) {
	this._store.captureBlob(blob, url, optContentType);
    },

    capture_file: function(fileInputElement, url) {
	this._store.captureFile(fileInputElement, url);
    },

    get_captured_file_name: function(url) {
	return this._store.getCapturedFileName(url);
    },

    get_header: function(url, name) {
	return this._store.getHeader(url, name);
    },

    get_all_headers: function(url) {
	return this._store.getAllHeaders(url);
    },

    get_as_blob: function(url) {
	return this._store.getAsBlob(url);
    },

    create_file_submitter: function() {
	return this._store.createFileSubmitter();
    }
});

var ManagedResourceStore = type ('ManagedResourceStore', object, {
    _store: null,

    __init__: function(name, requiredCookie) {
	this._store = localServer.createManagedStore(name, requiredCookie);
	this._store.onerror = getattr(this, 'onSyncError');
        this._store.oncomplete = getattr(this, 'onSyncComplete');
	this._store.onprogress = getattr(this, 'onSyncProgress');
    },

    delete: function() {
	localServer.removeManagedStore(this.name, this.required_cookie);
    },

    get name(){
	return this._store.name;
    },
    
    get required_cookie(){
	return this._store.requiredCookie;
    },

    get enabled(){
	return this._store.enabled;
    },

    set enabled( value ){
	this._store.enabled = value;
    },

    get manifest_url(){
	return this._store.manifestUrl;
    },

    set manifest_url( value ){
	this._store.manifestUrl = value;
    },

    get last_update_check_time(){
	return this._store.lastUpdateCheckTime;
    },

    get update_status(){
	return this._store.updateStatus;
    },

    get last_error_message(){
	return this._store.lastErrorMessage;
    },

    get current_version(){
	return this._store.currentVersion;
    },

    onSyncProgress: function onSyncProgress(event) {
	print(Math.ceil(((event.filesComplete / event.filesTotal) * 100)) + "%");
    },

    onSyncComplete: function onSyncComplete() {
	print("Sync Complete.");
    },

    onSyncError: function onSyncError(event) {
	print("Error Syncing.");
    },

    check_for_update: function check_for_update(){
	this._store.checkForUpdate();
    }
});

publish({
    can_serve_locally: can_serve_locally,
    ResourceStore: ResourceStore,
    ManagedResourceStore: ManagedResourceStore
});
