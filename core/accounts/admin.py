from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'id', 'first_name', 'last_name' ,'date_joined','is_active','isTfaActive')
    ordering = ('email',)
    fieldsets = (
        ("2FA Ayarları", {'fields': ('isTfaActive', 'tfaSecret')}),
    ) + UserAdmin.fieldsets

admin.site.register(CustomUser, CustomUserAdmin)