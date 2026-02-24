import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.app_role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Načíst default sazby
        const defaultRatesDomestic = user.default_hourly_rates_domestic || {};
        const defaultRatesInternational = user.default_hourly_rates_international || {};

        // Načíst všechny montážníky
        const workers = await base44.asServiceRole.entities.Worker.list();

        let updatedCount = 0;
        const updates = [];

        // Pro každého montážníka nastavit sazby podle seniority
        for (const worker of workers) {
            const seniority = worker.seniority;
            
            if (!seniority) continue;

            const domesticRate = defaultRatesDomestic[seniority];
            const internationalRate = defaultRatesInternational[seniority];

            // Updateovat pouze pokud má sazby v settings a montážník je nemá
            const updateData = {};
            
            if (domesticRate && !worker.hourly_rate_domestic) {
                updateData.hourly_rate_domestic = domesticRate;
            }
            
            if (internationalRate && !worker.hourly_rate_international) {
                updateData.hourly_rate_international = internationalRate;
            }

            if (Object.keys(updateData).length > 0) {
                await base44.asServiceRole.entities.Worker.update(worker.id, updateData);
                updatedCount++;
                updates.push({
                    worker: `${worker.first_name} ${worker.last_name}`,
                    seniority: seniority,
                    ...updateData
                });
            }
        }

        return Response.json({
            success: true,
            message: `Aktualizováno ${updatedCount} montážníků`,
            updated: updates
        });

    } catch (error) {
        console.error('Error migrating rates:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});