# -*- coding: utf-8 -*-
# coding: utf-8
from blog.post.models import Post, Tag
from django.shortcuts import render_to_response
from django.template.context import RequestContext

def index(request):
    return render_to_response('show_posts.html', {
                                'posts': Post.objects.all().order_by('-date'),
                                'tags': Tag.objects.all().order_by('title')},
                                context_instance=RequestContext(request));