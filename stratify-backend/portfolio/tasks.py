from celery import shared_task

from .models import Portfolio


@shared_task
def update_portfolio_values():
    n = 0
    for p in Portfolio.objects.all():
        for h in p.holdings.select_related('stock').all():
            h.calculate_values()
        p.calculate_totals()
        n += 1
    return f'portfolios_{n}'
