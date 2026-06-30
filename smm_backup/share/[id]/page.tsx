'use client';

import { useState, useEffect } from 'react';

interface ReportData {
  id: string;
  name: string;
  period: string;
  budget: number;
  conversions: number;
  reach: number;
  impressions: number;
  clicks: number;
  platforms: {
    facebook: boolean;
    instagram: boolean;
    whatsapp: boolean;
    messenger: boolean;
  };
  revenue: number;
  targetCpa: number;
  targetConversions: number;
  logoUrl: string | null;
  weeklyConversions: number[];
  compareData?: string; // stringified object containing: { budget, conversions, revenue }
}

interface CompareObj {
  budget: number;
  conversions: number;
  revenue: number;
}

export default function PublicReportViewer({
  params
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const resolvedParams = 'then' in params ? await params : params;
        const { id } = resolvedParams;
        
        const res = await fetch(`/api/reports/${id}`);
        if (!res.ok) {
          throw new Error('Não foi possível encontrar o relatório informado.');
        }
        
        const data = await res.json();
        
        // Parse platforms and weeklyConversions if they are JSON strings
        const parsedReport: ReportData = {
          ...data,
          platforms: typeof data.platforms === 'string' ? JSON.parse(data.platforms) : data.platforms,
          weeklyConversions: typeof data.weeklyConversions === 'string' ? JSON.parse(data.weeklyConversions) : data.weeklyConversions,
        };
        
        setReport(parsedReport);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar o relatório público.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [params]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 100, 224, 0.1)', borderTopColor: 'var(--meta-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Carregando relatório seguro...</div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Relatório Indisponível</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px' }}>{error || 'O link pode estar expirado ou incorreto.'}</p>
        <a href="/" style={{ marginTop: '12px', padding: '10px 20px', background: 'var(--meta-blue)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>Voltar para a Página Inicial</a>
      </div>
    );
  }

  // Calculations
  const {
    name, period, budget, conversions, reach, impressions, clicks, platforms, revenue, targetCpa, targetConversions, logoUrl, weeklyConversions, compareData
  } = report;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? budget / clicks : 0;
  const cpm = impressions > 0 ? (budget / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? budget / conversions : 0;
  const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const roas = budget > 0 ? revenue / budget : 0;

  const conversionsGoalPct = targetConversions > 0 ? Math.min(100, (conversions / targetConversions) * 100) : 0;
  const cpaStatus = cpa <= targetCpa ? 'healthy' : 'warning';

  // Compare parsing
  let compare: CompareObj | null = null;
  if (compareData) {
    try {
      compare = typeof compareData === 'string' ? JSON.parse(compareData) : compareData;
    } catch (e) {
      console.error(e);
    }
  }

  // Delta calculation helper
  const getDeltaPct = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    const delta = ((curr - prev) / prev) * 100;
    return delta;
  };

  const getDeltaBadge = (delta: number | null, inverse = false) => {
    if (delta === null) return null;
    const isPositive = delta > 0;
    const isSuccess = inverse ? !isPositive : isPositive;
    const sign = isPositive ? '+' : '';
    
    return (
      <span className={`widget-badge ${isSuccess ? '' : 'negative'}`} style={{
        marginLeft: '6px',
        fontSize: '10px',
        padding: '2px 6px',
        background: isSuccess ? 'var(--success-glow)' : 'var(--error-glow)',
        color: isSuccess ? 'var(--success)' : 'var(--error)',
        fontWeight: 'bold',
        borderRadius: '4px'
      }}>
        {sign}{delta.toFixed(1)}%
      </span>
    );
  };

  // SVG Line Chart coordinates calculations
  const maxWeekly = Math.max(...weeklyConversions, 1);
  const chartHeight = 110;
  
  const getPointsPath = () => {
    const xCoords = [40, 120, 200, 280];
    const points = weeklyConversions.map((val, idx) => {
      const y = 135 - (val / maxWeekly) * chartHeight;
      return `${xCoords[idx]},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const getAreaPath = () => {
    const xCoords = [40, 120, 200, 280];
    const points = weeklyConversions.map((val, idx) => {
      const y = 135 - (val / maxWeekly) * chartHeight;
      return `${xCoords[idx]},${y}`;
    });
    return `M 40,145 L ${points.join(' L ')} L 280,145 Z`;
  };

  const clickPctOfImp = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Auto Insights Engine
  const generateInsights = () => {
    const insights: { type: 'success' | 'warning' | 'info'; title: string; text: string }[] = [];

    if (roas >= 4) {
      insights.push({
        type: 'success',
        title: 'ROAS Altamente Lucrativo 🚀',
        text: `Seu ROAS de ${roas.toFixed(2)}x está excelente. O retorno comercial indica margem segura para escalabilidade de orçamento.`
      });
    } else if (roas >= 1.5) {
      insights.push({
        type: 'success',
        title: 'Retorno Operacional Saudável',
        text: `ROAS em ${roas.toFixed(2)}x. O tráfego pago está cobrindo os custos e gerando lucro líquido operacional.`
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Retorno Limitado',
        text: `ROAS de ${roas.toFixed(2)}x está próximo ou abaixo do ponto de equilíbrio. Revise ofertas ou otimize criativos.`
      });
    }

    if (cpa <= targetCpa) {
      insights.push({
        type: 'success',
        title: 'Meta de Custo CPA Atingida',
        text: `O CPA de R$ ${cpa.toFixed(2)} está controlado e dentro do limite aceitável planejado (R$ ${targetCpa.toFixed(2)}).`
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Custo de Aquisição Elevado',
        text: `CPA real de R$ ${cpa.toFixed(2)} ultrapassou a meta de R$ ${targetCpa.toFixed(2)}. Sugerimos revisar filtros de público.`
      });
    }

    if (ctr >= 2.0) {
      insights.push({
        type: 'success',
        title: 'Criativos com Forte Engajamento',
        text: `Sua CTR de ${ctr.toFixed(2)}% está acima do mercado. O público demonstrou forte interesse nos anúncios.`
      });
    } else if (ctr < 1.2) {
      insights.push({
        type: 'warning',
        title: 'Fadiga de Criativos',
        text: `CTR de ${ctr.toFixed(2)}% indica baixa atratividade. Sugerimos testar novas imagens ou abordagens em vídeo.`
      });
    }

    return insights;
  };

  const insightsList = generateInsights();

  // Platform list render
  const activePlatforms = Object.entries(platforms)
    .filter(([_, active]) => active)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(', ');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top action bar (web only) */}
      <div className="share-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Relatório Compartilhado</span>
        </div>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, var(--meta-blue) 0%, #0088ff 100%)', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17v2m-4-2v2" />
          </svg>
          Salvar Relatório como PDF
        </button>
      </div>

      {/* REPORT SHEET */}
      <section className="report-sheet" id="printable-report" style={{ border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div className="report-watermark"></div>
        
        {/* Header Relatório */}
        <div className="report-header">
          <div className="brand-display">
            {logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <img src={logoUrl} alt="Logo Cliente" style={{ height: '42px', maxWidth: '140px', objectFit: 'contain' }} />
                <span className="brand-name" style={{ fontSize: '20px' }}>{name}</span>
              </div>
            ) : (
              <span className="brand-name">{name}</span>
            )}
            <span className="report-period">Relatório de Resultados • Período: {period} • Canais: {activePlatforms || 'Nenhum'}</span>
          </div>
          <div className="meta-branding-stamp">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
              <path d="M19.167 6.467c-1.442 0-2.825.683-3.666 1.833-.842-1.15-2.225-1.833-3.667-1.833-2.617 0-4.834 2.15-4.834 4.883v1.925l8.5 7.825 8.5-7.825v-1.925c0-2.733-2.217-4.883-4.833-4.883zM1.917 11.35C1.917 6.133 6.2 1.85 11.417 1.85c2.408 0 4.675.917 6.408 2.533L15.933 6.3c-1.225-1.075-2.808-1.7-4.516-1.7-3.9 0-7.075 3.175-7.075 7.075 0 3.9 3.175 7.075 7.075 7.075 1.708 0 3.291-.625 4.516-1.7l1.892 1.917c-1.733 1.616-4 2.533-6.408 2.533C6.2 21.5 1.917 17.217 1.917 11.35zm20.166 0c0 5.867-4.283 10.15-9.5 10.15-2.408 0-4.675-.917-6.408-2.533l1.892-1.917c1.225 1.075 2.808 1.7 4.516 1.7 3.9 0 7.075-3.175 7.075-7.075 0-3.9-3.175-7.075-7.075-7.075-1.708 0-3.291.625-4.516 1.7L6.175 4.383C7.908 2.767 10.175 1.85 12.583 1.85c5.217 0 9.5 4.283 9.5 9.5z" />
            </svg>
            Meta Ads Partner
          </div>
        </div>

        {/* KPIs Principais de Negócios */}
        <div className="widgets-grid">
          <div className="widget-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="widget-title">Valor Investido</span>
              {compare && getDeltaBadge(getDeltaPct(budget, compare.budget), true)}
            </div>
            <div className="widget-value">
              R$ {budget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="widget-footer">Custo total da campanha</div>
          </div>

          <div className="widget-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="widget-title">Faturamento Gerado</span>
              {compare && getDeltaBadge(getDeltaPct(revenue, compare.revenue))}
            </div>
            <div className="widget-value" style={{ color: 'var(--success)' }}>
              R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="widget-footer">Retorno bruto em vendas</div>
          </div>

          <div className="widget-card" style={{ background: 'linear-gradient(135deg, rgba(37,211,102,0.08) 0%, rgba(12,18,48,0.5) 100%)', borderColor: roas >= 2 ? 'rgba(37,211,102,0.3)' : 'var(--border-color)' }}>
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="widget-title" style={{ color: 'var(--success)' }}>ROAS</span>
              {compare && getDeltaBadge(getDeltaPct(roas, compare.budget > 0 ? compare.revenue / compare.budget : 0))}
            </div>
            <div className="widget-value" style={{ color: '#25d366' }}>
              {roas.toFixed(2)}x
            </div>
            <div className="widget-footer">Retorno sobre gasto</div>
          </div>

          <div className="widget-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="widget-title">Clientes Convertidos</span>
              {compare && getDeltaBadge(getDeltaPct(conversions, compare.conversions))}
            </div>
            <div className="widget-value">
              {conversions}
            </div>
            <div className="widget-footer">Meta: {targetConversions} leads ({conversionsGoalPct.toFixed(0)}%)</div>
          </div>
        </div>

        {/* Funnel e Gráficos */}
        <div className="visual-sections">
          {/* Funnel Simplificado (3 Estágios) */}
          <div className="visual-card">
            <div className="card-title">
              Funil de Performance (Visualizações ➔ Vendas)
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Eficiência de Conversão</span>
            </div>
            <div className="funnel-container" style={{ gap: '16px', marginTop: '10px' }}>
              <div className="funnel-stage" style={{ height: '36px' }}>
                <div className="funnel-bar" style={{ width: '100%' }}>
                  Visualizações (Impressões): {impressions.toLocaleString('pt-BR')}
                </div>
                <span className="funnel-label">Exposição (100%)</span>
              </div>

              <div className="funnel-stage" style={{ height: '36px' }}>
                <div className="funnel-bar" style={{ width: `${Math.max(20, clickPctOfImp * 8)}%` }}>
                  Cliques de Interesse: {clicks.toLocaleString('pt-BR')}
                </div>
                <span className="funnel-label">Cliques ({clickPctOfImp.toFixed(2)}%)</span>
              </div>

              <div className="funnel-stage" style={{ height: '36px' }}>
                <div className="funnel-bar" style={{ width: `${Math.max(15, clickPctOfImp * 8 * (convRate / 100))}%`, background: 'var(--whatsapp-gradient)' }}>
                  Vendas/Leads (Conversões): {conversions.toLocaleString('pt-BR')}
                </div>
                <span className="funnel-label" style={{ color: 'var(--success)' }}>
                  Conversões ({convRate.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico Semanal */}
          <div className="visual-card">
            <div className="card-title">
              Evolução Semanal de Conversões
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tendência</span>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: '150px' }}>
              <svg width="100%" height="100%" viewBox="0 0 320 150" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--meta-blue)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--meta-blue)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                <line x1="40" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.02)" strokeDasharray="3,3" />
                <line x1="40" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.05)" />

                <path d={getAreaPath()} fill="url(#chartGrad)" />

                <path
                  d={getPointsPath()}
                  fill="none"
                  stroke="var(--meta-blue)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {weeklyConversions.map((val, idx) => {
                  const xCoords = [40, 120, 200, 280];
                  const y = 135 - (val / maxWeekly) * chartHeight;
                  return (
                    <g key={idx}>
                      <circle
                        cx={xCoords[idx]}
                        cy={y}
                        r="5"
                        fill="var(--accent-cyan)"
                        stroke="#04060f"
                        strokeWidth="2"
                      />
                      <text
                        x={xCoords[idx]}
                        y={y - 8}
                        fill="var(--text-primary)"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                <text x="40" y="152" fill="var(--text-muted)" fontSize="9" textAnchor="middle">S1</text>
                <text x="120" y="152" fill="var(--text-muted)" fontSize="9" textAnchor="middle">S2</text>
                <text x="200" y="152" fill="var(--text-muted)" fontSize="9" textAnchor="middle">S3</text>
                <text x="280" y="152" fill="var(--text-muted)" fontSize="9" textAnchor="middle">S4</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Diagnósticos e Métricas Técnicas Secundárias */}
        <div className="insights-diagnostics-container">
          
          {/* Diagnósticos Automatizados */}
          <div className="visual-card" style={{ gap: '12px' }}>
            <div className="card-title">
              Diagnóstico Automático (Performance)
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Engine Local</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {insightsList.map((ins, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: ins.type === 'success' ? 'rgba(37,211,102,0.04)' : 'rgba(244,63,94,0.04)',
                  borderLeft: `3px solid ${ins.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                  fontSize: '11px'
                }}>
                  <span style={{ fontWeight: 800, color: ins.type === 'success' ? '#34d399' : '#f87171', marginBottom: '2px' }}>{ins.title}</span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Métricas Técnicas Secundárias */}
          <div className="visual-card">
            <div className="card-title">
              Métricas de Otimização Técnica
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Operacional</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>CPA (Custo por Lead/Venda)</span>
                <span style={{ fontWeight: 700, color: cpaStatus === 'healthy' ? 'var(--success)' : 'var(--error)' }}>
                  R$ {cpa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>CTR (Taxa de Cliques)</span>
                <span style={{ fontWeight: 700 }}>{ctr.toFixed(2)}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>CPC Médio (Custo por Clique)</span>
                <span style={{ fontWeight: 700 }}>R$ {cpc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>CPM Médio (Custo por Mil Visualizações)</span>
                <span style={{ fontWeight: 700 }}>R$ {cpm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Alcance / Cliques totais</span>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{reach.toLocaleString('pt-BR')} / {clicks.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé Relatório */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>Gerado automaticamente via Meta Reports Engine</span>
          <span>Confidencial • {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </section>
      
      {/* Hide header bar on print */}
      <style jsx global>{`
        @media print {
          .share-actions-bar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
