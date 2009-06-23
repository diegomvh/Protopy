var ObjectDoesNotExist = type('ObjectDoesNotExist', Exception);
var MultipleObjectsReturned = type('MultipleObjectsReturned', Exception);
var SuspiciousOperation = type('SuspiciousOperation', Exception);
var PermissionDenied = type('PermissionDenied', Exception);
var ViewDoesNotExist = type('ViewDoesNotExist', Exception);
var MiddlewareNotUsed = type('MiddlewareNotUsed', Exception);
var ImproperlyConfigured = type('ImproperlyConfigured', Exception);
var FieldError = type('FieldError', Exception);
var ValidationError = type('ValidationError', Exception);
var FullResultSet = type('FullResultSet', Exception);
var EmptyResultSet = type('EmptyResultSet', Exception);

publish({
    ObjectDoesNotExist: ObjectDoesNotExist,
    MultipleObjectsReturned: MultipleObjectsReturned,
    SuspiciousOperation: SuspiciousOperation,
    PermissionDenied: PermissionDenied,
    ViewDoesNotExist: ViewDoesNotExist,
    MiddlewareNotUsed: MiddlewareNotUsed,
    ImproperlyConfigured: ImproperlyConfigured,
    FieldError: FieldError,
    ValidationError: ValidationError,
    FullResultSet: FullResultSet,
    EmptyResultSet: EmptyResultSet 
});