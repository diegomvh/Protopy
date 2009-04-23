function chain() { 
    var args = array(arguments);
    for each (var arg in args)
        for each (var r in arg)
            yield r;
}

function cycle(iterable) { 
    var collector = [];
    for each (var e in iterable) {
        yield e;
        collector.push(e);
    }
    for (var i = 0; true; i++){
        if (collector.length == i) i = 0;
        yield collector[i];
    }
}

function count(){ throw new NotImplementedError('Sorry'); }
function dropwhile(){ throw new NotImplementedError('Sorry'); }
function groupby(){ throw new NotImplementedError('Sorry'); }
function ifilter(){ throw new NotImplementedError('Sorry'); }
function ifilterfalse(){ throw new NotImplementedError('Sorry'); }
function imap(){ throw new NotImplementedError('Sorry'); }
function islice(){ throw new NotImplementedError('Sorry'); }
function izip(){ throw new NotImplementedError('Sorry'); }
function repeat(){ throw new NotImplementedError('Sorry'); }
function starmap(){ throw new NotImplementedError('Sorry'); }
function takewhile(){ throw new NotImplementedError('Sorry'); }
function tee(){ throw new NotImplementedError('Sorry'); }

$P({ 
    'chain': chain,
    'count': count,
    'cycle': cycle,
    'dropwhile': dropwhile,
    'groupby': groupby,
    'ifilter': ifilter,
    'ifilterfalse': ifilterfalse,
    'imap': imap,
    'islice': islice,
    'izip': izip,
    'repeat': repeat,
    'starmap': starmap,
    'takewhile': takewhile,
    'tee': tee
});