from django.contrib import admin

from .models import Forecast, Sentiment, Stock


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'name', 'sector', 'current_price', 'change_percent')
    search_fields = ('symbol', 'name')


admin.site.register(Sentiment)
admin.site.register(Forecast)
