import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart2 } from 'lucide-react';

export default function BudgetSummaryTable({ projects, allCosts, cnbRates = {} }) {
  const rows = useMemo(() => {
    return projects
      .filter(p => p.budget && p.budget > 0)
      .map(p => {
        const budgetCurrency = p.budget_currency || 'CZK';
        const rate = budgetCurrency === 'CZK' ? 1 : (cnbRates[budgetCurrency] ?? 1);
        const budgetCZK = p.budget * rate;
        // Sum all costs in CZK using amount_czk (fallback to amount for old records)
        const costsCZK = allCosts
          .filter(c => c.project_id === p.id)
          .reduce((sum, c) => sum + Number(c.amount_czk ?? c.amount), 0);
        const pct = budgetCZK > 0 ? (costsCZK / budgetCZK) * 100 : 0;
        return { project: p, costsCZK, budgetCZK, budgetCurrency, budget: p.budget, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [projects, allCosts, cnbRates]);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          Čerpání rozpočtů
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 font-medium">Projekt</th>
                <th className="pb-2 font-medium text-right">Rozpočet</th>
                <th className="pb-2 font-medium text-right">Náklady</th>
                <th className="pb-2 font-medium w-40 pl-4">Čerpání</th>
                <th className="pb-2 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, costsCZK, budgetCZK, budgetCurrency, budget, pct }) => (
                <tr key={project.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-800">{project.name}</td>
                  <td className="py-3 text-right whitespace-nowrap text-slate-600">
                    {budget.toLocaleString('cs-CZ')} {budgetCurrency}
                    {budgetCurrency !== 'CZK' && (
                      <div className="text-xs text-slate-400">≈ {Math.round(budgetCZK).toLocaleString('cs-CZ')} CZK</div>
                    )}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap text-slate-700 font-medium">
                    {costsCZK.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CZK
                  </td>
                  <td className="py-3 pl-4 w-40">
                    <Progress
                      value={Math.min(pct, 100)}
                      className={
                        pct > 100
                          ? '[&>div]:bg-red-500'
                          : pct > 80
                          ? '[&>div]:bg-orange-400'
                          : '[&>div]:bg-green-500'
                      }
                    />
                  </td>
                  <td className={`py-3 text-right font-semibold whitespace-nowrap ${pct > 100 ? 'text-red-600' : pct > 80 ? 'text-orange-500' : 'text-green-600'}`}>
                    {Math.round(pct)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
