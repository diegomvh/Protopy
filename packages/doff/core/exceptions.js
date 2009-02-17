var ObjectDoesNotExist = Class('ObjectDoesNotExist', Exception);
var MultipleObjectsReturned = Class('MultipleObjectsReturned', Exception);
var SuspiciousOperation = Class('SuspiciousOperation', Exception);
var PermissionDenied = Class('PermissionDenied', Exception);
var ViewDoesNotExist = Class('ViewDoesNotExist', Exception);
var MiddlewareNotUsed = Class('MiddlewareNotUsed', Exception);
var ImproperlyConfigured = Class('ImproperlyConfigured', Exception);
var FieldError = Class('FieldError', Exception);
var ValidationError = Class('ValidationError', Exception);
var FullResultSet = Class('FullResultSet', Exception);
var EmptyResultSet = Class('EmptyResultSet', Exception);

$P({    'ObjectDoesNotExist': ObjectDoesNotExist,
        'MultipleObjectsReturned': MultipleObjectsReturned,
        'SuspiciousOperation': SuspiciousOperation,
        'PermissionDenied': PermissionDenied,
        'ViewDoesNotExist': ViewDoesNotExist,
        'MiddlewareNotUsed': MiddlewareNotUsed,
        'ImproperlyConfigured': ImproperlyConfigured,
        'FieldError': FieldError,
        'ValidationError': ValidationError,
        'FullResultSet': FullResultSet,
        'EmptyResultSet': EmptyResultSet });