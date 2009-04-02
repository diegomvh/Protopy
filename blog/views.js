$L('doff.template.context', 'Context');
$L('doff.template.loader');

function index(request){
//     print("Request", request);
    var t = loader.get_template('index.html');
    $Q('#content')[0].innerHTML = t.render(new Context());
}

$P({ 'index': index });