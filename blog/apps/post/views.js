$L('event');
$L('blog.apps.post.models', 'Tag', 'Post');
$L('doff.forms.*');
$L('doff.template.*');
$L('doff.template.default_filters', 'slugify');
$L('doff.template.loader');
$L('doff.template.context', 'RequestContext');
$L('doff.core.http', 'HttpResponse', 'HttpResponseRedirect');

var PostForm = type('PostForm', forms.ModelForm, {
    'Meta': {
        'model': Post
    }
});

var TagForm = type('TagForm', forms.ModelForm, {
    'Meta': {
        'model': Tag
    }
});

function add_tag(request){
    if (request.method == 'post') {
	var [obj, crated] = Tag.objects.get_or_create({'slug':slugify(request['post']['title']), 'defaults': {'title':request['post']['title']}});
	return new HttpResponseRedirect('/');
    } else {
        var t = loader.get_template('add_tag.html');
        var formtag = new TagForm();
	var response = new HttpResponse();
	response.write(t.render(new RequestContext(request, {'formtag': formtag })));
	return response;
    }
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    print(tag);
    tag.delete();
    return new HttpResponseRedirect('/');
}

function remove_post(request, slug){
    var post = Post.objects.get({'slug': slug});
    post.delete();
    return new HttpResponseRedirect('/');
}

function add_post(request){
    print(request);
    if (request.method == 'post') {
	var [post, created] = Post.objects.get_or_create({'slug': slugify(request.post.title),
						     'defaults': {'title':request.post.title, 'slug':slugify(request.post.title), 
						     'body':request.post.body, 'date': new Date()}});
        post.tags.add.apply(post.tags, request.post.tags);
	return new HttpResponseRedirect('/');
    } else {
        var t = loader.get_template('add_post.html');
        var formpost = new PostForm();
	var response = new HttpResponse();
	response.write(t.render(new RequestContext(request, {'formpost': formpost })));
	return response;
    }
}

$P({ 'add_tag': add_tag,
     'add_post': add_post,
     'remove_tag': remove_tag,
     'remove_post': remove_post
});