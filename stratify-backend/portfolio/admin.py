from django.contrib import admin

from .models import Holding, Portfolio


class HoldingInline(admin.TabularInline):
    model = Holding
    extra = 0


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    inlines = [HoldingInline]
    list_display = ('user', 'total_value', 'total_return_percentage')
