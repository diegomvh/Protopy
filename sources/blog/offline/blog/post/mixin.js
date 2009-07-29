Post = {
    __str__: function() {
        return this.title;
    },
    pepe: function() {
        return 'pepe';
    }
};

Tag = {
    __str__: function() {
        return this.title;
    }
};

publish({
    Post: Post,
    Tag: Tag
});