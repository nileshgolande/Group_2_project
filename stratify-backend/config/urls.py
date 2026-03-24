from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from chat.views import ChatHistoryView, ChatView
from portfolio.views import AddHoldingView, PortfolioChartView, PortfolioView, RemoveHoldingView
from stocks.bizmetric_views import CommodityMlPredictionView, StockEdaAnalyticsView, StockMlPredictionSeriesView
from stocks.views import (
    StockChartView,
    SectorPortfoliosView,
    StockDetailView,
    StockForecastChartView,
    StockForecastView,
    StockListView,
    StockSentimentView,
    StockTechnicalView,
)
from users.views import LoginView, ProfileView, RegisterView, SetMPinView, VerifyMPinView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/auth/set-mpin/', SetMPinView.as_view(), name='auth-set-mpin'),
    path('api/auth/verify-mpin/', VerifyMPinView.as_view(), name='auth-verify-mpin'),
    path('api/auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('api/ml/predictions/stock/<str:symbol>/', StockMlPredictionSeriesView.as_view(), name='ml-stock-series'),
    path('api/ml/predictions/asset/<str:asset>/', CommodityMlPredictionView.as_view(), name='ml-commodity-series'),
    path('api/ml/analytics/<str:symbol>/', StockEdaAnalyticsView.as_view(), name='ml-stock-analytics'),
    path('api/stocks/', StockListView.as_view(), name='stock-list'),
    path('api/stocks/<str:symbol>/', StockDetailView.as_view(), name='stock-detail'),
    path('api/stocks/<str:symbol>/forecast/', StockForecastView.as_view(), name='stock-forecast'),
    path('api/stocks/<str:symbol>/technical/', StockTechnicalView.as_view(), name='stock-technical'),
    path('api/chart/<str:symbol>/', StockChartView.as_view(), name='stock-candlestick'),
    path('api/forecast-chart/<str:symbol>/', StockForecastChartView.as_view(), name='stock-forecast-chart'),
    path('api/stocks/<str:symbol>/sentiment/', StockSentimentView.as_view(), name='stock-sentiment'),
    path('api/sector-portfolios/', SectorPortfoliosView.as_view(), name='sector-portfolios'),
    path('api/portfolio/', PortfolioView.as_view(), name='portfolio'),
    path('api/portfolio/add/', AddHoldingView.as_view(), name='portfolio-add'),
    path('api/portfolio/<int:holding_id>/', RemoveHoldingView.as_view(), name='portfolio-remove'),
    path('api/portfolio-chart/', PortfolioChartView.as_view(), name='portfolio-chart'),
    path('api/chat/', ChatView.as_view(), name='chat'),
    path('api/chat/history/', ChatHistoryView.as_view(), name='chat-history'),
]
