
var CommonMiddleware = type('CommonMiddleware', [ object ], {
    
    process_request: function(request) {
        return;
    },

    process_response: function(request, response) {
        return response;
    }
});

publish({
    CommonMiddleware: CommonMiddleware
});