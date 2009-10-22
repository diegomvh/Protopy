from django.contrib import admin
from offline.models import *

admin.site.register(GearsManifest)
admin.site.register(GearsManifestEntry)
admin.site.register(SyncData)
admin.site.register(SyncLog)


