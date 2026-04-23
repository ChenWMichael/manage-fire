from typing import List, Optional

from app.schemas.fire import FireCalculationInput, FireCalculationResult, YearlyProjection


def calculate_fire(data: FireCalculationInput) -> FireCalculationResult:
    r_annual = data.expected_annual_return / 100
    r_monthly = r_annual / 12
    fi_number = data.annual_expenses * (100 / data.withdrawal_rate)

    is_already_fi = data.current_savings >= fi_number
    progress_pct = min(100.0, (data.current_savings / fi_number * 100)) if fi_number > 0 else 0

    projections: List[YearlyProjection] = []
    portfolio = data.current_savings
    years_to_fire: Optional[int] = None
    fire_age: Optional[int] = None

    if is_already_fi:
        years_to_fire = 0
        fire_age = data.current_age

    max_years = min(60, 100 - data.current_age)

    for year in range(max_years + 1):
        age = data.current_age + year
        projections.append(
            YearlyProjection(
                year=year,
                age=age,
                portfolio_value=round(portfolio, 2),
                fi_number=round(fi_number, 2),
            )
        )

        if portfolio >= fi_number and years_to_fire is None and not is_already_fi:
            years_to_fire = year
            fire_age = age

        for _ in range(12):
            portfolio = portfolio * (1 + r_monthly) + data.monthly_contribution

    years_to_retirement = max(0, data.retirement_age - data.current_age)
    if years_to_retirement > 0 and r_annual > 0:
        coast_fire_number = fi_number / ((1 + r_annual) ** years_to_retirement)
    else:
        coast_fire_number = fi_number

    months_to_retirement = years_to_retirement * 12
    monthly_needed: Optional[float] = None
    if months_to_retirement > 0:
        if r_monthly > 0:
            fv_current = data.current_savings * (1 + r_monthly) ** months_to_retirement
            remaining = fi_number - fv_current
            if remaining <= 0:
                monthly_needed = 0.0
            else:
                monthly_needed = remaining * r_monthly / ((1 + r_monthly) ** months_to_retirement - 1)
        else:
            monthly_needed = max(0.0, (fi_number - data.current_savings) / months_to_retirement)

    return FireCalculationResult(
        fi_number=round(fi_number, 2),
        years_to_fire=years_to_fire,
        fire_age=fire_age,
        coast_fire_number=round(coast_fire_number, 2),
        monthly_needed_for_target=round(monthly_needed, 2) if monthly_needed is not None else None,
        projections=projections,
        is_already_fi=is_already_fi,
        progress_percentage=round(progress_pct, 1),
    )
