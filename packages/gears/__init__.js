if (window.google && window.google.gears) {
    return;
}
print('*Do not* define any objects if Gears is not installed. This mimics the behavior of Gears defining the objects in the future.');
var factory = null;
if (typeof GearsFactory != 'undefined') {
    factory = new GearsFactory();
} else {
    try {
      factory = new ActiveXObject('Gears.Factory');
      if (factory.getBuildInfo().indexOf('ie_mobile') != -1) {
        factory.privateSetGlobalObject(this);
      }
    } catch (e) {
      if ((typeof navigator.mimeTypes != 'undefined')
           && navigator.mimeTypes["application/x-googlegears"]) {
        factory = document.createElement("object");
        factory.style.display = "none";
        factory.width = 0;
        factory.height = 0;
        factory.type = "application/x-googlegears";
        document.documentElement.appendChild(factory);
      }
    }
  }

if (!factory) {
    alert('Please install gears');
    window.location = 'http://gears.google.com/';
}

if (!window.google) {
    var google = {};
}

if (!google.gears) {
    google.gears = {factory: factory};
}

$B({'google': google});