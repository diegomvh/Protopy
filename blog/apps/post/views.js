$L('event');
$L('blog.apps.post.models', 'Tag', 'Post', 'Usuario');
$L('doff.forms.*');
$L('doff.template.*');
$L('doff.template.default_filters', 'slugify');
$L('doff.template.loader');
$L('doff.template.context', 'Context');

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

function syncdb(){
    print('Creando las tablas');
    var s = $L('doff.core.commands.syncdb');
    s.execute();
}

function add_tag(request){
    if (request.method == 'post') {
	var [obj, crated] = Tag.objects.get_or_create({'slug':slugify(request['post']['title']), 'defaults': {'title':request['post']['title']}});
	show_posts(request);
    }
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    tag.del();
    show_posts(request);
}

function add_post(title, body, tags){
    var [obj, created] = Post.objects.get_or_create({'slug':slugify(title), 'defaults': {'title':title, 'slug':slugify(title), 'body':body, 'date': new Date()}});
    for each (var tag in tags) obj.tags.add(tag);
    return obj;
}

function set_tags_by_title(post, tag_title){
    tag_title = (type(tag_title) == Array)? tag_title : [tag_title];
    var tags = [];
    for each (var title in tag_title) {
        tags.push(Tag.objects.get({'title':title}));
    }
    post.tags.add.apply(post.tags,tags);
}

function show_posts(request){
    var t = loader.get_template('post.html');
    var formtag = new TagForm();
    var formpost = new PostForm();
    $Q('#content')[0].innerHTML = t.render(new Context({'tags': Tag.objects.all(), 'formtag': formtag, 'formpost': formpost, 'posts': Post.objects.all().order_by('-title')}));
}

$P({ 'syncdb': syncdb,
     'add_tag': add_tag,
     'add_post': add_post,
     'remove_tag': remove_tag,
     'show_posts': show_posts,
     'PostForm': PostForm,
     'set_tags_by_title': set_tags_by_title});