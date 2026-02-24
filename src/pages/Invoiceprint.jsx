import React, { useState, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Project } from "@/entities/Project";
import { Worker } from "@/entities/Worker";
import { ClientCompanyProfile } from "@/entities/ClientCompanyProfile";
import { ContractualTextTemplate } from "@/entities/ContractualTextTemplate";
import { format } from "date-fns";

export default function Invoiceprint() {
  const [invoice, setInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [worker, setWorker] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const invoiceId = urlParams.get('id');
      if (!invoiceId) { setError("ID objednávky nebylo zadáno"); setIsLoading(false); return; }

      const [invoices, projects, workers, profiles, templates] = await Promise.all([
        Invoice.list(), Project.list(), Worker.list(),
        ClientCompanyProfile.list(), ContractualTextTemplate.list()
      ]);

      const invoiceData = invoices.find(i => i.id === invoiceId);
      if (!invoiceData) { setError("Objednávka nenalezena"); setIsLoading(false); return; }

      setInvoice(invoiceData);
      setProject(projects.find(p => p.id === invoiceData.project_id));
      setWorker(workers.find(w => w.id === invoiceData.worker_id));
      setClientProfile(profiles.find(cp => cp.id === invoiceData.client_profile_id));
      setContractTemplate(templates.find(t => t.id === invoiceData.contractual_template_id));
      document.title = `Objednavka_${invoiceData.invoice_number}`;
      setIsLoading(false);

      const urlParams2 = new URLSearchParams(window.location.search);
      if (urlParams2.get('print') === '1') setTimeout(() => window.print(), 600);
    } catch (err) {
      setError("Chyba při načítání: " + err.message);
      setIsLoading(false);
    }
  };

  if (error) return (
    <div className="p-8 text-center">
      <div className="bg-red-50 border border-red-200 rounded p-4 max-w-md mx-auto">
        <h2 className="text-red-800 font-bold mb-2">Chyba</h2>
        <p className="text-red-600">{error}</p>
        <button onClick={() => window.close()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">Zavřít</button>
      </div>
    </div>
  );

  if (isLoading || !invoice) return (
    <div className="p-8 text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-lg">Načítání objednávky...</p>
    </div>
  );

  const fmt = (n) => (n ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; color: #1a1a1a; }

        @media screen {
          body { background: #e8e8e8; }
          .print-page {
            max-width: 21cm;
            margin: 24px auto;
            background: white;
            padding: 2cm 2.2cm;
            box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            min-height: 29.7cm;
          }
        }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .print-page { margin: 0; padding: 1.5cm 2cm; box-shadow: none; }
          @page { margin: 0; size: A4; }
        }

        /* Header */
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 3px solid #1e3a5f;
        }
        .doc-header-logo img { max-height: 64px; max-width: 180px; object-fit: contain; }
        .doc-header-logo .company-name-big { font-size: 22px; font-weight: 800; color: #1e3a5f; }
        .doc-header-title { text-align: right; }
        .doc-header-title h1 { font-size: 26px; font-weight: 800; color: #1e3a5f; margin: 0 0 4px; letter-spacing: -0.5px; }
        .doc-header-title .doc-number { font-size: 14px; color: #555; margin: 0; }
        .doc-header-title .doc-date { font-size: 12px; color: #888; margin-top: 2px; }

        /* Parties */
        .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 22px; }
        .party-box { border: 1.5px solid #d1d5db; border-radius: 6px; padding: 14px 16px; }
        .party-box-header { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
        .party-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .party-row { font-size: 12px; color: #374151; line-height: 1.6; }
        .party-label { color: #6b7280; font-size: 11px; }

        /* Work spec */
        .spec-box { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin-bottom: 22px; }
        .spec-box-header { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
        .spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .spec-item label { display: block; font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
        .spec-item span { font-size: 13px; color: #1f2937; font-weight: 500; }
        .spec-item.full { grid-column: 1 / -1; }

        /* Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 12px; }
        .items-table thead tr { background: #1e3a5f; color: white; }
        .items-table thead th { padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
        .items-table thead th.right { text-align: right; }
        .items-table thead th.center { text-align: center; }
        .items-table tbody tr { border-bottom: 1px solid #e5e7eb; }
        .items-table tbody tr:nth-child(even) { background: #f9fafb; }
        .items-table tbody td { padding: 9px 12px; color: #1f2937; vertical-align: top; }
        .items-table tbody td.right { text-align: right; }
        .items-table tbody td.center { text-align: center; }
        .items-table .total-row td { background: #1e3a5f; color: white; font-weight: 700; font-size: 13px; padding: 12px; border-top: 2px solid #1e3a5f; }
        .items-table .total-row td.right { text-align: right; }

        /* Summary */
        .summary-section { margin-top: 20px; display: flex; justify-content: flex-end; }
        .summary-box { width: 280px; }
        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row.total { font-size: 16px; font-weight: 800; color: #1e3a5f; padding-top: 10px; margin-top: 4px; border-top: 2px solid #1e3a5f; border-bottom: none; }

        /* Meta row */
        .meta-row { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; margin-bottom: 24px; }

        /* Contract text */
        .contract-section {
          break-before: page;
          page-break-before: always;
          margin-top: 0;
          padding-top: 24px;
        }
        .contract-section h3 { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #6b7280; margin-bottom: 12px; }
        .contract-text { font-size: 10px; line-height: 1.7; color: #374151; white-space: pre-wrap; }

        /* Signatures */
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
        .sig-box { text-align: center; }
        .sig-line { border-top: 1.5px solid #374151; margin-top: 48px; padding-top: 6px; font-size: 11px; color: #6b7280; }
        .sig-name { font-size: 12px; font-weight: 600; color: #111827; margin-top: 2px; }
      `}</style>

      {/* Plovoucí panel */}
      <div className="no-print" style={{position:'fixed',top:16,right:16,background:'white',padding:16,borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:9999,minWidth:200}}>
        <p style={{fontSize:12,marginBottom:8,color:'#555'}}>Stiskněte <strong>Ctrl+P</strong> nebo:</p>
        <button onClick={() => window.print()} style={{background:'#1e3a5f',color:'white',border:'none',padding:'8px 16px',borderRadius:6,width:'100%',cursor:'pointer',marginBottom:6,fontWeight:600}}>
          Stáhnout PDF
        </button>
        <button onClick={() => window.close()} style={{background:'#f3f4f6',color:'#374151',border:'none',padding:'8px 16px',borderRadius:6,width:'100%',cursor:'pointer'}}>
          Zavřít
        </button>
      </div>

      <div className="print-page">

        {/* HEADER */}
        <div className="doc-header">
          <div className="doc-header-logo">
            {clientProfile?.logo_url
              ? <img src={clientProfile.logo_url} alt="Logo" />
              : <div className="company-name-big">{clientProfile?.company_name ?? ''}</div>
            }
          </div>
          <div className="doc-header-title">
            <h1>OBJEDNÁVKA</h1>
            <p className="doc-number">č. {invoice.invoice_number}</p>
            <p className="doc-date">Vystaveno: {invoice.issue_date ? format(new Date(invoice.issue_date), 'd. M. yyyy') : '—'}</p>
          </div>
        </div>

        {/* OBJEDNATEL + ZHOTOVITEL */}
        <div className="parties-grid">
          <div className="party-box">
            <div className="party-box-header">Objednatel</div>
            {clientProfile ? (
              <>
                <div className="party-name">{clientProfile.company_name}</div>
                <div className="party-row">{clientProfile.street_address}</div>
                <div className="party-row">{clientProfile.postal_code} {clientProfile.city}</div>
                {clientProfile.country && <div className="party-row">{clientProfile.country}</div>}
                <div style={{marginTop:8}}>
                  <div className="party-row"><span className="party-label">IČO: </span>{clientProfile.ico}</div>
                  {clientProfile.dic && <div className="party-row"><span className="party-label">DIČ: </span>{clientProfile.dic}</div>}
                </div>
                <div style={{marginTop:8}}>
                  {clientProfile.phone && <div className="party-row"><span className="party-label">Tel: </span>{clientProfile.phone}</div>}
                  {clientProfile.email && <div className="party-row"><span className="party-label">Email: </span>{clientProfile.email}</div>}
                </div>
              </>
            ) : <div className="party-row" style={{color:'#9ca3af'}}>—</div>}
          </div>

          <div className="party-box">
            <div className="party-box-header">Zhotovitel</div>
            {worker ? (
              <>
                <div className="party-name">{worker.first_name} {worker.last_name}</div>
                {worker.street_address && (
                  <div className="party-row">{worker.street_address}</div>
                )}
                {(worker.postal_code || worker.city) && (
                  <div className="party-row">{worker.postal_code} {worker.city}</div>
                )}
                <div style={{marginTop:8}}>
                  {worker.date_of_birth && <div className="party-row"><span className="party-label">Datum narození: </span>{format(new Date(worker.date_of_birth), 'd. M. yyyy')}</div>}
                  {worker.nationality && <div className="party-row"><span className="party-label">Občanství: </span>{worker.nationality}</div>}
                  {worker.id_number && <div className="party-row"><span className="party-label">IČO/RČ: </span>{worker.id_number}</div>}
                </div>
                {worker.phone && (
                  <div style={{marginTop:8}}>
                    <div className="party-row"><span className="party-label">Tel: </span>{worker.phone}</div>
                    {worker.email && <div className="party-row"><span className="party-label">Email: </span>{worker.email}</div>}
                  </div>
                )}
              </>
            ) : <div className="party-row" style={{color:'#9ca3af'}}>—</div>}
          </div>
        </div>

        {/* SPECIFIKACE DÍLA */}
        {(invoice.work_specification || invoice.work_period || invoice.work_location) && (
          <div className="spec-box">
            <div className="spec-box-header">Specifikace díla</div>
            <div className="spec-grid">
              {invoice.work_specification && (
                <div className="spec-item">
                  <label>Popis prací</label>
                  <span>{invoice.work_specification}</span>
                </div>
              )}
              {invoice.work_period && (
                <div className="spec-item">
                  <label>Termín realizace</label>
                  <span>{invoice.work_period}</span>
                </div>
              )}
              {invoice.work_location && (
                <div className="spec-item full">
                  <label>Místo realizace</label>
                  <span>{invoice.work_location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POLOŽKY */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{width:'40%'}}>Popis položky</th>
              <th className="center" style={{width:'10%'}}>Množství</th>
              <th className="center" style={{width:'8%'}}>MJ</th>
              <th className="right" style={{width:'18%'}}>Cena / MJ</th>
              <th className="right" style={{width:'18%'}}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className="center">{item.quantity}</td>
                <td className="center">{item.unit}</td>
                <td className="right">{fmt(item.unit_price)} Kč</td>
                <td className="right" style={{fontWeight:600}}>{fmt(item.total_price)} Kč</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="summary-section">
          <div className="summary-box">
            <div className="summary-row">
              <span style={{color:'#6b7280'}}>Základ bez DPH</span>
              <span>{fmt(invoice.total_amount)} Kč</span>
            </div>
            <div className="summary-row">
              <span style={{color:'#6b7280'}}>DPH</span>
              <span>{fmt(invoice.vat_amount)} Kč</span>
            </div>
            <div className="summary-row total">
              <span>Celkem k úhradě</span>
              <span>{fmt(invoice.total_with_vat)} Kč</span>
            </div>
          </div>
        </div>

        {/* META */}
        <div className="meta-row">
          <span>Platnost objednávky: <strong>{invoice.validity_days} dní</strong> od vystavení</span>
          <span>Vyhotovil: <strong>{invoice.created_by_name}</strong></span>
          {project && <span>Projekt: <strong>{project.name}</strong></span>}
        </div>

        {/* SMLUVNÍ TEXT */}
        {contractTemplate && (
          <div className="contract-section">
            <h3>Smluvní podmínky</h3>
            <div className="contract-text">{contractTemplate.content}</div>
          </div>
        )}

        {/* PODPISY */}
        <div className="signatures">
          <div className="sig-box">
            <div className="sig-line">Podpis objednatele</div>
            <div className="sig-name">{clientProfile?.company_name ?? ''}</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">Podpis zhotovitele</div>
            <div className="sig-name">{worker ? `${worker.first_name} ${worker.last_name}` : ''}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
