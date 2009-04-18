from django.contrib import admin 


from doffproj.blog.models import Tag, Post

bolg_admin_site = admin.AdminSite()
bolg_admin_site.register(Tag)
bolg_admin_site.register(Post)

