import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart2 } from 'lucide-react';

export default function BudgetSummaryTable({ projects, allCosts }) {
  const rows = useMemo(() => {
    return projects
      .filter(p => p.budget && p.budget > 0)
      .map(p => {
        const currency = p.budget_currency || 'CZK';
        const costs = allCosts
          .filter(c => c.project_id === p.id && (c.currency || 'CZK') === currency)
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const pct = (costs / p.budget) * 100;
        return { project: p, costs, budget: p.budget, currency, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [projects, allCosts]);

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
              {rows.map(({ project, costs, budget, currency, pct }) => (
                <tr key={project.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-800">{project.name}</td>
                  <td className="py-3 text-right whitespace-nowrap text-slate-600">
                    {budget.toLocaleString('cs-CZ')} {currency}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap text-slate-700 font-medium">
                    {costs.toLocaleString('cs-CZ')} {currency}
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
