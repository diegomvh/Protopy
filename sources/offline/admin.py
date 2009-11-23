from django.contrib import admin
from offline.models import GearsManifest, GearsManifestEntry, SyncData

admin.site.register(GearsManifest)
admin.site.register(GearsManifestEntry)
admin.site.register(SyncData)


