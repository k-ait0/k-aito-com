// Frozen verbatim financial function extracted from DWZ R4 v16.9 draft research HTML.
// Pinned source branch: dwz-r4-v16-5-xserver-preview
// Pinned file Git blob SHA: f15d2ca56b65450e9a590f34bdcbe0d8959d1e59
// For isolated phase arithmetic tests ONLY. This is not an approved financial engine.
// Validation dependency, clone helper, and exports are provided by tests in VM.
function simulateOne(s, m) {
    (0, validation_js_1.validateInputs)(s, m);
    if (s.lifeEvents.some(e => e.effects.some(x => x.domain === 'finance')))
        throw Error('Financial events not yet implemented');
    const holdings = clone(s.portfolio.holdings), assets = Object.keys(holdings);
    if (assets.length !== 1)
        throw Error('Phase 1 alpha requires one asset');
    const asset = assets[0];
    if (!m.returns[asset])
        throw Error('Missing asset path');
    let deficit = 0, ever = false, peak = holdings[asset].marketValue, peakAge = s.person.simulationStartAgeMonths, firstWithdrawal = null, firstShortfall = null;
    let totalContributions = 0, totalWithdrawals = 0, totalInvestmentReturn = 0, totalExpenses = 0, totalIncome = 0, totalPension = 0;
    const timeline = [];
    for (let i = 0; i < m.months.length; i++) {
        const age = s.person.simulationStartAgeMonths + i, cpi = m.cpiIndex[i];
        let cf = 0, short = 0, contrib = 0, withdraw = 0, expense = 0, income = 0, pension = 0;
        const value = (x) => {
            if (age < x.startAgeMonths || (x.endAgeMonths !== undefined && age >= x.endAgeMonths))
                return 0;
            if (x.escalationModel.type === 'CUSTOM_PATH')
                throw Error('CUSTOM_PATH unsupported');
            return x.monthlyAmount * (x.escalationModel.type === 'CPI_LINKED' ? cpi : 1);
        };
        const phase = (timing) => {
            let amount = 0;
            for (const x of s.expenseStreams)
                if (x.timing === timing) {
                    const v = value(x);
                    expense += v;
                    amount -= v;
                }
            for (const x of s.incomeStreams)
                if (x.timing === timing) {
                    const v = value(x);
                    income += v;
                    amount += v;
                }
            for (const x of s.pensionStreams)
                if (x.timing === timing) {
                    const v = value(x);
                    pension += v;
                    amount += v;
                }
            cf += amount;
            const h = holdings[asset];
            if (amount >= 0) {
                h.marketValue += amount;
                h.costBasis += amount;
                contrib += amount;
            }
            else {
                const before = h.marketValue, sold = Math.min(before, -amount);
                if (sold >= before) {
                    h.marketValue = 0;
                    h.costBasis = 0;
                }
                else {
                    h.marketValue -= sold;
                    h.costBasis *= 1 - sold / before;
                }
                withdraw += sold;
                if (sold > 0 && firstWithdrawal === null)
                    firstWithdrawal = age;
                const missing = -amount - sold;
                if (missing > 1e-8) {
                    short += missing;
                    deficit += missing;
                    ever = true;
                    if (firstShortfall === null)
                        firstShortfall = age;
                }
            }
        };
        phase('BEGINNING_OF_MONTH');
        const h = holdings[asset], investmentReturn = h.marketValue * m.returns[asset][i];
        h.marketValue += investmentReturn;
        phase('END_OF_MONTH');
        if (h.marketValue > peak) {
            peak = h.marketValue;
            peakAge = age;
        }
        totalContributions += contrib;
        totalWithdrawals += withdraw;
        totalInvestmentReturn += investmentReturn;
        totalExpenses += expense;
        totalIncome += income;
        totalPension += pension;
        timeline.push({ yearMonth: m.months[i], ageMonths: age, holdings: clone(holdings), totalAssets: h.marketValue, currentCashFlow: cf, cashShortfallThisMonth: short, cumulativeCashShortfall: deficit, currentlyInDeficit: short > 1e-8 && h.marketValue <= 1e-8, everDepleted: ever, investmentReturn, contributionsThisMonth: contrib, withdrawalsThisMonth: withdraw, expensesThisMonth: expense, incomeThisMonth: income, pensionThisMonth: pension, appliedEvents: [] });
    }
    const finalAssets = timeline.at(-1).totalAssets;
    return { timeline, summary: { finalAssets, peakAssets: peak, peakAgeMonths: peakAge, actualFirstWithdrawalAgeMonths: firstWithdrawal, firstShortfallAgeMonths: firstShortfall, cumulativeCashShortfall: deficit, targetAchieved: (s.target.valueBasis === 'REAL' ? finalAssets / m.cpiIndex.at(-1) : finalAssets) >= s.target.targetAssets, totalContributions, totalWithdrawals, totalInvestmentReturn, totalExpenses, totalIncome, totalPension }, provenance: { scenarioId: s.id, schemaVersion: s.schemaVersion, engineVersion: exports.ENGINE_VERSION, datasetVersion: m.datasetVersion, calculatedAt: '1970-01-01T00:00:00.000Z' } };
}

