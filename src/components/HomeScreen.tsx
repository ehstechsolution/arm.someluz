import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, FilePieChart, Briefcase, Sparkles, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#99CC33]/90 via-[#7ba82a] to-[#121212] p-6 text-white shadow-xl"
      >
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white opacity-10 blur-xl"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{companyConfig.nomeFantasia}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Painel {companyConfig.nomeFantasia}</h2>
          <p className="text-white/85 text-xs max-w-xs leading-relaxed">
            Bem-vindo ao centro estratégico de sonorização, iluminação e grandes produções.
          </p>
        </div>
      </motion.div>

      {/* Bento Grid layout */}
      <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">
        Visão Geral do Painel
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Bento Item 1: Status da Empresa (Span 2) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bento-card col-span-2 flex flex-col justify-between min-h-[110px]"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Status do Painel</span>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-primary mt-2">
              Operacional
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
              Servidores da nuvem e equipe ativa: <span className="font-mono text-gray-800 dark:text-zinc-300 font-bold">4/12 em campo</span>
            </p>
          </div>
        </motion.div>

        {/* Bento Item 2: Eventos (Span 1) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bento-card flex flex-col justify-between min-h-[110px]"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Eventos</span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              12
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
              Próximos 30 dias
            </p>
          </div>
        </motion.div>

        {/* Bento Item 3: Orçamentos (Span 1) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bento-card flex flex-col justify-between min-h-[110px]"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Orçamentos</span>
            <FilePieChart className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              08
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
              Pendentes no sistema
            </p>
          </div>
        </motion.div>

        {/* Bento Item 4: Maintenance Alert (Span 2) - Custom secondary color scheme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-2 bento-card bg-secondary/15 border-secondary/30 dark:bg-secondary/10 dark:border-secondary/20 p-4 rounded-2xl flex items-start gap-3"
        >
          <div className="rounded-xl bg-secondary/20 p-2 text-secondary shrink-0">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-950 dark:text-secondary-dark uppercase tracking-wider">
              Alerta de Manutenção
            </h4>
            <p className="text-xs text-gray-800 dark:text-zinc-300 leading-tight">
              3 Cabos XLR com falhas físicas reportadas em campo. Revisão urgente na oficina.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Under Construction Bottom Info */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-4 text-center dark:border-zinc-800">
        <div className="mx-auto space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Infraestrutura de Rede e Tecnologia
          </span>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
            Utilize as seções internas de Clientes, Acervo e Equipe para simular montagens de palcos e gerar orçamentos em tempo recorde.
          </p>
        </div>
      </div>
    </div>
  );
}
