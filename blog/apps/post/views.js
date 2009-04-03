$L('event');
$L('blog.apps.post.models', 'Tag', 'Post');
$L('doff.forms.*');
$L('doff.template.*');
$L('doff.template.default_filters', 'slugify');
$L('doff.template.loader');
$L('doff.template.context', 'RequestContext');

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
	blog.handler.handle('/');
    } else {
        var t = loader.get_template('add_tag.html');
        var formtag = new TagForm();
        $Q('#content')[0].innerHTML = t.render(new RequestContext(request, {'formtag': formtag }));
    }
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    tag.del();
    blog.handler.handle('/');
}

function remove_post(request, slug){
    var post = Post.objects.get({'slug': slug});
    post.del();
    blog.handler.handle('/');
}

function add_post(request){
    print(request);
    if (request.method == 'post') {
	var [post, created] = Post.objects.get_or_create({'slug': slugify(request.post.title),
						     'defaults': {'title':request.post.title, 'slug':slugify(request.post.title), 
						     'body':request.post.body, 'date': new Date()}});
        post.tags.add.apply(post.tags, request.post.tags);
	blog.handler.handle('/');
    } else {
        var t = loader.get_template('add_post.html');
        var formpost = new PostForm();
        $Q('#content')[0].innerHTML = t.render(new RequestContext(request, {'formpost': formpost }));
    }
}

function set_tags_by_title(request){
    tag_title = (type(tag_title) == Array)? tag_title : [tag_title];
    var tags = [];
    for each (var title in tag_title) {
        tags.push(Tag.objects.get({'title':title}));
    }
    post.tags.add.apply(post.tags,tags);
}

$P({ 'add_tag': add_tag,
     'add_post': add_post,
     'remove_tag': remove_tag,
     'remove_post': remove_post
});