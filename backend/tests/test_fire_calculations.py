"""
Unit tests for backend/app/services/fire_calculations.py

Run from the backend/ directory:
    pytest tests/test_fire_calculations.py -v
"""
import time

import pytest

from app.schemas.fire import FireCalculationInput
from app.services.fire_calculations import calculate_fire


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_input(**overrides) -> FireCalculationInput:
    defaults = dict(
        current_age=30,
        retirement_age=65,
        current_savings=50_000,
        monthly_contribution=2_000,
        annual_expenses=60_000,
        expected_annual_return=7.0,
        withdrawal_rate=4.0,
    )
    defaults.update(overrides)
    return FireCalculationInput(**defaults)


# ─── FI Number ────────────────────────────────────────────────────────────────

class TestFiNumber:
    def test_standard_4pct_rule(self):
        # 60000 / 0.04 = 1,500,000
        result = calculate_fire(make_input(annual_expenses=60_000, withdrawal_rate=4.0))
        assert result.fi_number == 1_500_000.0

    def test_3pct_withdrawal_rate(self):
        result = calculate_fire(make_input(annual_expenses=40_000, withdrawal_rate=3.0))
        assert result.fi_number == pytest.approx(40_000 * (100 / 3), rel=1e-4)

    def test_fi_number_scales_with_expenses(self):
        r1 = calculate_fire(make_input(annual_expenses=50_000, withdrawal_rate=4.0))
        r2 = calculate_fire(make_input(annual_expenses=100_000, withdrawal_rate=4.0))
        assert r2.fi_number == pytest.approx(r1.fi_number * 2, rel=1e-6)


# ─── Already-FI Detection ─────────────────────────────────────────────────────

class TestAlreadyFi:
    def test_already_fi_when_savings_exceed_fi_number(self):
        result = calculate_fire(make_input(current_savings=2_000_000))
        assert result.is_already_fi is True
        assert result.years_to_fire == 0
        assert result.fire_age == 30

    def test_not_already_fi_when_savings_below_fi_number(self):
        result = calculate_fire(make_input(current_savings=50_000))
        assert result.is_already_fi is False
        assert result.years_to_fire != 0

    def test_already_fi_progress_capped_at_100(self):
        result = calculate_fire(make_input(current_savings=2_000_000))
        assert result.progress_percentage == 100.0


# ─── Progress Percentage ──────────────────────────────────────────────────────

class TestProgressPercentage:
    def test_50pct_progress(self):
        # fi_number = 1,500,000; current_savings = 750,000 → 50%
        result = calculate_fire(make_input(current_savings=750_000, annual_expenses=60_000, withdrawal_rate=4.0))
        assert result.progress_percentage == 50.0

    def test_progress_capped_at_100_when_overfunded(self):
        result = calculate_fire(make_input(current_savings=10_000_000))
        assert result.progress_percentage == 100.0

    def test_low_savings_gives_low_progress(self):
        result = calculate_fire(make_input(current_savings=15_000, annual_expenses=60_000, withdrawal_rate=4.0))
        assert result.progress_percentage == pytest.approx(1.0, rel=0.01)


# ─── Projections ──────────────────────────────────────────────────────────────

class TestProjections:
    def test_projection_count_age_30(self):
        # max_years = min(60, 100-30) = 60 → year 0..60 = 61 entries
        result = calculate_fire(make_input(current_age=30))
        assert len(result.projections) == 61

    def test_projection_count_near_100(self):
        # max_years = min(60, 100-50) = 50 → 51 entries
        result = calculate_fire(make_input(current_age=50))
        assert len(result.projections) == 51

    def test_projection_year_zero_has_current_age(self):
        result = calculate_fire(make_input(current_age=35))
        assert result.projections[0].age == 35
        assert result.projections[0].year == 0

    def test_projection_first_value_equals_current_savings(self):
        result = calculate_fire(make_input(current_savings=75_000))
        assert result.projections[0].portfolio_value == 75_000.0

    def test_projections_grow_over_time_with_positive_return(self):
        result = calculate_fire(make_input(current_savings=10_000, monthly_contribution=1_000, expected_annual_return=7.0))
        assert result.projections[-1].portfolio_value > result.projections[0].portfolio_value

    def test_all_projections_have_same_fi_number(self):
        result = calculate_fire(make_input(annual_expenses=60_000, withdrawal_rate=4.0))
        for p in result.projections:
            assert p.fi_number == 1_500_000.0


# ─── CoastFIRE Number ─────────────────────────────────────────────────────────

class TestCoastFireNumber:
    def test_coast_fire_formula(self):
        # coast = fi_number / (1 + r) ^ years_to_retirement
        result = calculate_fire(make_input(
            current_age=30, retirement_age=65,
            annual_expenses=60_000, withdrawal_rate=4.0,
            expected_annual_return=7.0,
        ))
        fi = 1_500_000
        expected_coast = fi / (1.07 ** 35)
        assert result.coast_fire_number == pytest.approx(expected_coast, rel=0.01)

    def test_coast_fire_equals_fi_when_retirement_is_now(self):
        result = calculate_fire(make_input(current_age=65, retirement_age=65))
        assert result.coast_fire_number == result.fi_number

    def test_coast_fire_less_than_fi_when_retirement_is_future(self):
        result = calculate_fire(make_input(current_age=30, retirement_age=65))
        assert result.coast_fire_number < result.fi_number


# ─── Monthly Contribution Needed ─────────────────────────────────────────────

class TestMonthlyNeeded:
    def test_monthly_needed_zero_when_already_overfunded(self):
        result = calculate_fire(make_input(current_savings=2_000_000, current_age=30, retirement_age=65))
        assert result.monthly_needed_for_target == 0.0

    def test_zero_return_uses_linear_formula(self):
        # monthly_needed = (fi - savings) / months_to_retirement
        fi = 60_000 * 25  # 1,500,000
        months = 35 * 12
        expected = (fi - 50_000) / months
        result = calculate_fire(make_input(expected_annual_return=0.0))
        assert result.monthly_needed_for_target == pytest.approx(expected, rel=0.01)

    def test_monthly_needed_is_none_when_retirement_is_now(self):
        result = calculate_fire(make_input(current_age=65, retirement_age=65))
        assert result.monthly_needed_for_target is None


# ─── Years to FIRE ────────────────────────────────────────────────────────────

class TestYearsToFire:
    def test_years_to_fire_is_none_when_unreachable_in_horizon(self):
        # Zero contributions, low savings, very high expenses
        result = calculate_fire(make_input(
            current_savings=1_000,
            monthly_contribution=0,
            annual_expenses=1_000_000,
            expected_annual_return=2.0,
        ))
        assert result.years_to_fire is None
        assert result.fire_age is None

    def test_fire_age_equals_current_age_plus_years_to_fire(self):
        result = calculate_fire(make_input(current_age=30))
        if result.years_to_fire is not None:
            assert result.fire_age == 30 + result.years_to_fire


# ─── Performance ─────────────────────────────────────────────────────────────

class TestPerformance:
    def test_calculation_completes_under_50ms(self):
        start = time.perf_counter()
        calculate_fire(make_input())
        elapsed = time.perf_counter() - start
        assert elapsed < 0.05, f"FIRE calculation took {elapsed * 1000:.1f}ms (limit: 50ms)"
