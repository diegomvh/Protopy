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
    if (request.method == 'POST') {
	var formtag = new TagForm({ data: request.POST });
	if (formtag.is_valid()) {
	    var [obj, crated] = Tag.objects.get_or_create({'slug':slugify(request.POST['title']), 'defaults': {'title':request.POST['title']}});
	    return new HttpResponseRedirect('/');
	}
    } else {
	var formtag = new TagForm();
    }
    var t = loader.get_template('add_tag.html');
    var response = new HttpResponse();
    response.write(t.render(new RequestContext(request, {'formtag': formtag })));
    return response;
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    tag.delete();
    return new HttpResponseRedirect('/');
}

function remove_post(request, slug){
    var post = Post.objects.get({'slug': slug});
    post.delete();
    return new HttpResponseRedirect('/');
}

function add_post(request) {
    if (request.method == 'POST') {
	var formpost = new PostForm({ data: request.POST });
	if (formpost.is_valid()) {
	    var [post, created] = Post.objects.get_or_create({'slug': slugify(request.post.title),
						     'defaults': {'title':request.post.title, 'slug':slugify(request.post.title), 
						     'body':request.post.body, 'date': new Date()}});
	    post.tags.add.apply(post.tags, request.post.tags);
	    return new HttpResponseRedirect('/');
	}
    } else {
	var formpost = new PostForm();
    }
    var t = loader.get_template('add_post.html');
    var response = new HttpResponse();
    response.write(t.render(new RequestContext(request, {'formpost': formpost })));
    return response;
}

$P({ 'add_tag': add_tag,
     'add_post': add_post,
     'remove_tag': remove_tag,
     'remove_post': remove_post
});