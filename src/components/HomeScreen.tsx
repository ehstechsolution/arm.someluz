import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getFirebaseDb } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Orcamento, Contrato, Equipment } from '../types';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  MapPin, 
  Truck, 
  FileText, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function HomeScreen() {
  const [companyConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('als_company_config');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return {
      nomeFantasia: 'Arthur Luz e Som',
    };
  });

  // State arrays populated from Firebase (or LocalStorage fallback)
  const [budgets, setBudgets] = useState<Orcamento[]>([]);
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    
    // Default cached states or fallbacks to populate before firebase mounts
    try {
      const localBudgets = localStorage.getItem('als_orcamentos_v2');
      const localContracts = localStorage.getItem('als_contratos_v2');
      const localEquip = localStorage.getItem('als_equipamentos_v2');
      if (localBudgets) setBudgets(JSON.parse(localBudgets));
      if (localContracts) setContracts(JSON.parse(localContracts));
      if (localEquip) setEquipments(JSON.parse(localEquip));
    } catch (_) {}

    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Subscriptions to get real-time active data for Dashboard numbers
    const unsubBudgets = onSnapshot(collection(db, 'orcamentos'), (snapshot) => {
      const list: Orcamento[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as Orcamento);
      });
      setBudgets(list);
      localStorage.setItem('als_orcamentos_v2', JSON.stringify(list));
      setIsLoading(false);
    }, (err) => {
      console.warn("Dashboard offline/unauthorized budgets load:", err);
      setIsLoading(false);
    });

    const unsubContracts = onSnapshot(collection(db, 'contratos'), (snapshot) => {
      const list: Contrato[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as Contrato);
      });
      setContracts(list);
      localStorage.setItem('als_contratos_v2', JSON.stringify(list));
    }, (err) => {
      console.warn("Dashboard offline/unauthorized contracts load:", err);
    });

    const unsubEquip = onSnapshot(collection(db, 'equipamentos'), (snapshot) => {
      const list: Equipment[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as Equipment);
      });
      setEquipments(list);
      localStorage.setItem('als_equipamentos_v2', JSON.stringify(list));
    }, (err) => {
      console.warn("Dashboard offline/unauthorized equipment load:", err);
    });

    return () => {
      unsubBudgets();
      unsubContracts();
      unsubEquip();
    };
  }, []);

  // Helper navigate tab globally
  const handleNavigateTo = (targetTab: string) => {
    window.dispatchEvent(new CustomEvent('als_navigate_tab', { detail: targetTab }));
  };

  // Helper date parsing and representation
  const formatEventDate = (rawDate: any) => {
    if (!rawDate) return 'A definir';
    try {
      let d: Date;
      if (rawDate?.toDate) {
        d = rawDate.toDate();
      } else {
        d = new Date(rawDate);
      }
      if (isNaN(d.getTime())) return String(rawDate);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' - ' + d.getFullYear();
    } catch {
      return String(rawDate);
    }
  };

  // CALCULATING METRIC KPI VALUES (PASSO 1)
  const totalRevenue = contracts.reduce((acc, current) => {
    const val = Number(current.valorInvestimento) || 0;
    return acc + val;
  }, 0);

  // Conversion rate: (Contracts created vs Budgets count)
  const budgetsCount = budgets.length;
  const contractsCount = contracts.length;
  const conversionRate = budgetsCount > 0 
    ? Math.min(100, Math.round((contractsCount / budgetsCount) * 100)) 
    : 0;

  // Active or pending Budgets
  const activeBudgetsCount = budgets.filter(b => 
    b.status === 'proposta_solicitada' || b.status === 'pronto_para_envio'
  ).length;

  const totalWeaponsCount = equipments.length;

  // CHART DATA COMPUTATION (PASSO 2)
  // Distribution of Event Types
  const getEventTypesCount = () => {
    const counts: { [key: string]: number } = {
      'Casamento': 0,
      'Corporativo': 0,
      'Festa / Balada': 0,
      'Show / Festival': 0,
      'Outros': 0,
    };
    
    // Process through budgets
    budgets.forEach(b => {
      const type = (b.evento?.tipo_evento || b.pacote?.pacoteNome || '').toLowerCase();
      if (type.includes('casamento')) {
        counts['Casamento'] += 1;
      } else if (type.includes('corporativo') || type.includes('empresa') || type.includes('palestra')) {
        counts['Corporativo'] += 1;
      } else if (type.includes('festa') || type.includes('balada') || type.includes('aniversario') || type.includes('aniversário')) {
        counts['Festa / Balada'] += 1;
      } else if (type.includes('show') || type.includes('festival') || type.includes('palco')) {
        counts['Show / Festival'] += 1;
      } else if (b.id) {
        counts['Outros'] += 1;
      }
    });

    // Also look through contracts
    contracts.forEach(c => {
      const type = (c.pacoteNome || '').toLowerCase();
      if (type.includes('casamento')) {
        counts['Casamento'] += 1;
      } else if (type.includes('corporativo') || type.includes('empresa') || type.includes('palestra')) {
        counts['Corporativo'] += 1;
      } else if (type.includes('festa') || type.includes('balada') || type.includes('aniversario') || type.includes('aniversário')) {
        counts['Festa / Balada'] += 1;
      } else if (type.includes('show') || type.includes('festival') || type.includes('palco')) {
        counts['Show / Festival'] += 1;
      }
    });

    return Object.keys(counts).map(k => ({
      name: k,
      val: counts[k]
    })).sort((a,b) => b.val - a.val);
  };

  const eventTypeDistribution = getEventTypesCount();
  const maxCategoryVal = Math.max(...eventTypeDistribution.map(d => d.val), 1);

  // Generate Revenue Trend (Last 6 Months)
  const getRevenueTrend = () => {
    const list: { month: string; year: number; monthIndex: number; revenue: number }[] = [];
    const dateObj = new Date();
    
    // Create list of last 6 months
    const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(dateObj.getFullYear(), dateObj.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const label = monthShortNames[mIdx];
      list.push({
        month: label,
        year: d.getFullYear(),
        monthIndex: mIdx,
        revenue: 0
      });
    }

    // Accumulate actual contract data
    contracts.forEach((c) => {
      let d: Date | null = null;
      if (c.dataEvento) {
        d = new Date(c.dataEvento);
      } else if (c.dataCriacao) {
        d = new Date(c.dataCriacao);
      } else if (c.createdAt) {
        d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      }
      
      if (d && !isNaN(d.getTime())) {
        const itemMonthIndex = d.getMonth();
        const itemYear = d.getFullYear();
        
        // Find which month this goes to
        const matched = list.find((m) => m.monthIndex === itemMonthIndex && m.year === itemYear);
        if (matched) {
          matched.revenue += Number(c.valorInvestimento) || 0;
        }
      }
    });

    // Also consider Approved Budgets that aren't turned into contracts yet to give a complete Pipeline
    budgets.forEach((b) => {
      const isLinkedToContract = contracts.some(c => c.eventoId === b.id || c.pacoteId === b.pacote?.pacoteId);
      if (b.status === 'aprovado' && !isLinkedToContract) {
        let d: Date | null = null;
        if (b.evento?.data_evento) {
          d = b.evento.data_evento?.toDate ? b.evento.data_evento.toDate() : new Date(b.evento.data_evento);
        } else if (b.dataEvento) {
          d = new Date(b.dataEvento);
        } else if (b.createdAt) {
          d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        }

        if (d && !isNaN(d.getTime())) {
          const itemMonthIndex = d.getMonth();
          const itemYear = d.getFullYear();
          
          const matched = list.find((m) => m.monthIndex === itemMonthIndex && m.year === itemYear);
          if (matched) {
            matched.revenue += Number(b.pacote?.valorTotal) || Number(b.value) || 0;
          }
        }
      }
    });

    return list.map(item => ({
      month: item.month,
      revenue: item.revenue
    }));
  };

  const revenueTrend = getRevenueTrend();
  const maxTrendVal = Math.max(...revenueTrend.map(r => r.revenue), 1000);

  // UPCOMING EVENTS DATA (PASSO 3)
  // Build a timeline unified list of upcoming events from either contracts or budgets, sorted by date
  interface UnifiedEventItem {
    id: string;
    origin: 'contrato' | 'orcamento';
    title: string;
    clientName: string;
    tipoEvento: string;
    date: string;
    local: string;
    totalValue: number;
    logisticsFee: number;
    status: string;
  }

  const getUnifiedEvents = (): UnifiedEventItem[] => {
    const list: UnifiedEventItem[] = [];

    contracts.forEach(c => {
      list.push({
        id: c.id || Math.random().toString(),
        origin: 'contrato',
        title: c.pacoteNome || 'Contrato Sonorização',
        clientName: c.contratanteNome || 'Cliente Corporativo',
        tipoEvento: 'Evento Confirmado',
        date: c.dataEvento || '',
        local: c.localEvento || 'Local a definir',
        totalValue: c.valorInvestimento || 0,
        logisticsFee: 0, // Fallback
        status: c.status || 'Ativo'
      });
    });

    budgets.forEach(b => {
      // Avoid duplicate listing if already turned into contract with original id
      const isLinkedToContract = contracts.some(c => c.eventoId === b.id || c.pacoteId === b.pacote?.pacoteId);
      if (!isLinkedToContract) {
        list.push({
          id: b.id || Math.random().toString(),
          origin: 'orcamento',
          title: b.pacote?.pacoteNome || 'Orçamento Sonorização',
          clientName: b.cliente?.nomeCompleto || b.clientName || 'Cliente Particular',
          tipoEvento: b.evento?.tipo_evento || 'Sonorização',
          date: b.evento?.data_evento || b.dataEvento || '',
          local: b.evento?.local_evento || b.localEvento || 'Local a definir',
          totalValue: b.pacote?.valorTotal || b.value || 0,
          logisticsFee: b.evento?.taxa_deslocamento ?? b.evento?.taxaDeslocamento ?? b.pacote?.taxaDeslocamento ?? 0,
          status: b.status
        });
      }
    });

    // Parse and Sort by soonest date
    return list
      .filter(item => item.date)
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return timeA - timeB;
      })
      .slice(0, 4); // upcoming 4
  };

  const upcomingEvents = getUnifiedEvents();

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER COM DETALHES DE LOGO */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 text-white border border-zinc-800 shadow-2xl"
      >
        <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-primary/10 opacity-40 blur-2xl"></div>
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-secondary/10 opacity-30 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#99CC33]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Painel Executivo</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              {companyConfig.nomeFantasia}
            </h2>
            <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
              Controle absoluto de sonorização, iluminação e logística em tempo real. Monitorando faturamento e cronograma de campo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Banco de Dados Ativo • SSL</span>
          </div>
        </div>
      </motion.div>

      {/* PASSO 1: GRID DE CARDS DEMANDAS DO NEGÓCIO - METRICAS KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Faturamento Fechado */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between"
          id="kpi-faturamento"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Contratos Fechados</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 mt-1 font-bold">
              <TrendingUp className="h-3 w-3" />
              <span>Faturamento Total do Acervo</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 2: Taxa de Conversão */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between"
          id="kpi-conversao"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Conversão em Contrato</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {conversionRate}%
            </span>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 font-mono">
              <span>{contractsCount} fechados / {budgetsCount} emitidos</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 3: Orçamentos Pendentes */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between"
          id="kpi-pendentes"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Orçamentos Ativos</span>
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-500">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {activeBudgetsCount.toString().padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-orange-500 mt-1 font-bold">
              <Clock className="h-3 w-3" />
              <span>Aguardando Aprovação</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 4: Equipamentos / Acervo */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between"
          id="kpi-equipamentos"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Acervo Cadastrado</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {totalWeaponsCount.toString().padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-indigo-500 mt-1 font-bold">
              <Activity className="h-3 w-3 animate-pulse" />
              <span>Ativos & Equipados em Campo</span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* PASSO 2: VISUAL CHART PANELS (GRÁFICOS DE RECEITA E MIX DE EVENTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* CHART 1: Evolução Faturamento Real (SVG Line/Area Chart) */}
        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-450">Prospecção de Vendas</h3>
              <p className="text-xs font-black text-gray-900 dark:text-white">Evolução Mensal Estimada (BRL)</p>
            </div>
            <div className="text-[10px] bg-[#99CC33]/15 text-[#7ba82a] font-bold px-2 py-0.5 rounded-md">
              Atualizado
            </div>
          </div>

          {/* Simple Highly Aesthetic SVG Line Area chart */}
          <div className="h-44 w-full flex items-end justify-between gap-1 pt-4 relative">
            <div className="absolute top-0 right-0 left-0 border-b border-gray-100 dark:border-zinc-800/40 h-10 flex items-center justify-end">
              <span className="text-[8px] text-zinc-400 font-mono">{(maxTrendVal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
            </div>
            <div className="absolute top-16 right-0 left-0 border-b border-gray-100 dark:border-zinc-800/40 h-10 flex items-center justify-end">
              <span className="text-[8px] text-zinc-400 font-mono">{(maxTrendVal * 0.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
            </div>

            {/* SVG Path visual line vector representation */}
            <svg viewBox="0 0 620 160" className="absolute inset-0 h-40 w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#99CC33" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#99CC33" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Complex Area Spline */}
              <path 
                d={`
                  M 10 160 
                  L 10 ${160 - (revenueTrend[0].revenue / maxTrendVal) * 120}
                  Q 60 ${160 - (revenueTrend[1].revenue / maxTrendVal) * 120} 120 ${160 - (revenueTrend[1].revenue / maxTrendVal) * 120}
                  T 240 ${160 - (revenueTrend[2].revenue / maxTrendVal) * 120}
                  T 360 ${160 - (revenueTrend[3].revenue / maxTrendVal) * 120}
                  T 480 ${160 - (revenueTrend[4].revenue / maxTrendVal) * 120}
                  T 600 ${160 - (revenueTrend[5].revenue / maxTrendVal) * 120}
                  L 600 160 Z
                `}
                fill="url(#chart-area-grad)"
              />
              <path 
                d={`
                  M 10 ${160 - (revenueTrend[0].revenue / maxTrendVal) * 120}
                  Q 60 ${160 - (revenueTrend[1].revenue / maxTrendVal) * 120} 120 ${160 - (revenueTrend[1].revenue / maxTrendVal) * 120}
                  T 240 ${160 - (revenueTrend[2].revenue / maxTrendVal) * 120}
                  T 360 ${160 - (revenueTrend[3].revenue / maxTrendVal) * 120}
                  T 480 ${160 - (revenueTrend[4].revenue / maxTrendVal) * 120}
                  T 600 ${160 - (revenueTrend[5].revenue / maxTrendVal) * 120}
                `}
                fill="none"
                stroke="#99CC33"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Highlight Nodes */}
              {revenueTrend.map((t, i) => {
                const ratio = i / 5;
                const xPos = 10 + ratio * 580;
                const yPos = 160 - (t.revenue / maxTrendVal) * 120;
                return (
                  <circle 
                    key={i}
                    cx={xPos} 
                    cy={yPos} 
                    r="5" 
                    fill="#1e1e1e" 
                    stroke="#99CC33" 
                    strokeWidth="3.5" 
                    className="cursor-pointer hover:r-7 transition-all"
                  />
                )
              })}
            </svg>

            {/* Horizontal Axis month triggers */}
            {revenueTrend.map((t, idx) => (
              <div key={idx} className="flex-1 text-center flex flex-col items-center justify-end z-10">
                <span className="text-[10px] font-mono leading-none font-bold text-gray-800 dark:text-zinc-200">{t.month}</span>
                <span className="text-[8px] text-zinc-400 mt-0.5 leading-none font-mono">{(t.revenue).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: Mix de Segmentos de Eventos / Atuação */}
        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-450">Mix de Segmentos</h3>
              <p className="text-xs font-black text-gray-900 dark:text-white">Demanda de Produção de Palco</p>
            </div>
            <span className="text-[9px] text-zinc-450 font-bold uppercase">Volume Ativo</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {eventTypeDistribution.map((item, index) => {
              const widthPct = Math.round((item.val / maxCategoryVal) * 100);
              // Pick aesthetic colors
              const colors = [
                'bg-[#99CC33]', 
                'bg-orange-500', 
                'bg-indigo-500', 
                'bg-sky-500', 
                'bg-amber-500'
              ];
              const colorClass = colors[index % colors.length];

              return (
                <div key={item.name} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-gray-700 dark:text-zinc-300">{item.name}</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white">{item.val} eventos</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800/50 w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                      className={`h-full rounded-full ${colorClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* PASSO 3: FEED DE PRÓXIMOS EVENTOS, LOGÍSTICA E ALARMES */}
      <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 space-y-4">
        
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Demanda e Escopo Logístico</h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-tight">Feed cronológico integrado de campo</p>
            </div>
          </div>
          <button 
            onClick={() => handleNavigateTo('documentos')}
            className="flex items-center gap-1 text-[11px] font-black text-[#99CC33] hover:underline cursor-pointer"
          >
            <span>Ver Todos</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* FEED EVENT LIST */}
        <div className="divide-y divide-gray-50 dark:divide-zinc-800/30">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 dark:text-zinc-500 space-y-1.5">
              <Info className="h-6 w-6 text-zinc-500 mx-auto opacity-40" />
              <p className="font-bold">Nenhum evento registrado com data</p>
              <p className="text-[10.5px]">Crie um orçamento no painel de Documentos com data para acompanhá-lo aqui.</p>
            </div>
          ) : (
            upcomingEvents.map((item, idx) => {
              // Alarm logic: check if travel logistics displacement fee is zero or missing for active events
              const hasLogisticAlarm = item.logisticsFee === 0 && item.origin === 'orcamento';
              
              // Status Styling
              const getStatusStyles = (statusStr: string) => {
                switch(statusStr) {
                  case 'aprovado':
                  case 'Ativo':
                    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
                  case 'proposta_solicitada':
                    return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-250/30 dark:border-yellow-900/30';
                  case 'pronto_para_envio':
                    return 'bg-orange-50 text-orange-600 dark:bg-orange-950/25 dark:text-orange-400 border border-orange-250/30 dark:border-orange-900/30';
                  default:
                    return 'bg-gray-50 text-gray-600 dark:bg-zinc-800/40 dark:text-zinc-400 border border-gray-200/55 dark:border-zinc-750';
                }
              };

              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  onClick={() => handleNavigateTo('documentos')}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between py-3.5 gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 cursor-pointer rounded-xl px-2.5 transition-colors"
                >
                  
                  {/* Left Column event specs */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-bold ${getStatusStyles(item.status)}`}>
                        {item.status === 'proposta_solicitada' ? 'Pendente' : 
                         item.status === 'aprovado' || item.status === 'Ativo' ? 'Confirmado' : 
                         item.status === 'pronto_para_envio' ? 'Pronto' : item.status}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3" />
                        {formatEventDate(item.date)}
                      </span>
                    </div>
                    
                    <h4 className="text-xs font-black text-gray-900 dark:text-zinc-200 truncate pr-4">
                      {item.title}
                    </h4>
                    
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:border-zinc-950 truncate">
                      <span className="font-bold text-gray-700 dark:text-zinc-400 font-sans">
                        Cliente: {item.clientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-zinc-500" />
                        {item.local}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Values & Logistic Fee & Alarms */}
                  <div className="flex items-center gap-4 shrink-0 self-end md:self-center font-mono">
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-900 dark:text-white">
                        {Number(item.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      
                      {/* Logistics fee block */}
                      <p className="text-[9px] text-gray-400 flex items-center gap-1 justify-end font-bold">
                        <Truck className="h-3 w-3 text-[#99CC33]" />
                        <span>Desl: {item.logisticsFee > 0 ? item.logisticsFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Isento'}</span>
                      </p>
                    </div>

                    {/* ALARM CRITICAL GATES IF TRAVEL FEE IS ZERO */}
                    {hasLogisticAlarm ? (
                      <div className="bg-red-50 dark:bg-red-950/20 text-red-500 p-2 rounded-xl animate-pulse cursor-help border border-red-200/50 dark:border-red-900/30" title="Alerta: Deslocamento logístico zerado para este orçamento! Verifique custo de viagem.">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="text-gray-250 dark:text-zinc-750 p-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                  </div>

                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
