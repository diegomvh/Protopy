require('doff.utils.http', '*');

function index(request){


    return new HttpResponse('Hola mundo');

}

publish({ 
    index: index,
});
