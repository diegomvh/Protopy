$L('blog.apps.post.models', 'Tag', 'Post');
$L('doff.template');
$L('doff.template.default_filters', 'slugify');
$L('doff.template.loader');
$L('doff.template.context', 'Context');

function syncdb(){
    print('Creando las tablas');
    var s = $L('doff.core.commands.syncdb');
    s.execute();
}

function add_tag(title, description){
    var [obj, crated] = Tag.objects.get_or_create({'title':title, 'slug':slugify(title), 'description': description});
    return obj;
}

function add_post(title, body, tags){
    var [obj, created] = Post.objects.get_or_create({'title':title, 'slug':slugify(title), 'body':body, 'date': new Date()});
    for each (var tag in tags) obj.tags_set.add(tag);
    return obj;
}

function set_tags_by_title(post, tag_title){
    tag_title = isarray(tag_title)? tag_title : [tag_title];
    for each (var title in tag_title) {
	var tag = Tag.objects.get({'title':title});
	post.tags_set.add(tag);
    }
}

function show_posts(){
    var t = loader.get_template('post.html');
    document.write(t.render(new Context({posts:Post.objects.all()})));
    document.close();
}

$P({ 'syncdb': syncdb,
     'add_tag': add_tag,
     'add_post': add_post,
     'show_posts': show_posts,
     'set_tags_by_title': set_tags_by_title});