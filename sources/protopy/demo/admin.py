from django.contrib import admin 

from blog.post.models import Tag, Post

bolg_admin_site = admin.AdminSite()

class TagAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}

class PostAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}

bolg_admin_site.register(Tag, TagAdmin)
bolg_admin_site.register(Post, PostAdmin)

