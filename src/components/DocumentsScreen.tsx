import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, Calendar, User, DollarSign, X, Briefcase, ChevronRight } from 'lucide-react';
import { DocumentItem } from '../types';
import { INITIAL_DOCUMENTS, loadData, saveData } from '../data';

export default function DocumentsScreen() {
  const [activeTab, setActiveTab] = useState<'orcamento' | 'contrato'>('orcamento');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');

  // Load documents
  useEffect(() => {
    // We loaded INITIAL_DOCUMENTS or empty based on user specs (originally "lista vazia")
    // Let's load empty with sample or let them delete/create
    const loaded = loadData<DocumentItem>('documents', INITIAL_DOCUMENTS);
    setDocuments(loaded);
  }, []);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim() || !value || !date) return;

    const newDoc: DocumentItem = {
      id: 'doc_' + Date.now(),
      title,
      clientName,
      value: parseFloat(value),
      type: activeTab,
      date
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveData('documents', updated);

    // Reset fields
    setTitle('');
    setClientName('');
    setValue('');
    setDate('');
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    const updated = documents.filter(doc => doc.id !== id);
    setDocuments(updated);
    saveData('documents', updated);
  };

  const filteredDocs = documents.filter(doc => doc.type === activeTab);

  return (
    <div className="relative space-y-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">Documentação Técnica</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Emissão e controle de propostas</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs in header */}
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-zinc-800/80">
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all ${
            activeTab === 'orcamento'
              ? 'bg-white text-gray-950 shadow-xs dark:bg-zinc-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Orçamentos
        </button>
        <button
          onClick={() => setActiveTab('contrato')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all ${
            activeTab === 'contrato'
              ? 'bg-white text-gray-950 shadow-xs dark:bg-zinc-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Contratos
        </button>
      </div>

      {/* Main List view */}
      <div className="space-y-3">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={doc.id}
              className="group relative flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/50"
            >
              <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    doc.type === 'orcamento' ? 'bg-secondary' : 'bg-primary'
                  }`}></span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.title}</h4>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    {doc.clientName}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    {doc.date}
                  </span>
                </div>
              </div>

              {/* Price Tag and action */}
              <div className="text-right flex flex-col items-end gap-1">
                <span className="font-mono text-xs font-bold text-primary dark:text-primary">
                  {doc.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-[10px] text-red-500 hover:text-red-600 transition-colors opacity-70 hover:opacity-100"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-16 text-center text-gray-400 dark:text-zinc-500">
            <FileText className="mx-auto h-8 w-8 opacity-40 mb-3 text-gray-400" />
            <p className="text-sm font-medium">Nenhum registro encontrado</p>
            <p className="text-[10px] mt-1">Toque no botão flutuante laranja "+" para adicionar.</p>
          </div>
        )}
      </div>

      {/* Floating orange action button for the active document view */}
      <button
        onClick={() => setShowAddModal(true)}
        className="active-click fixed right-6 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition-all hover:bg-secondary-dark focus:outline-none"
        style={{ boxShadow: '0 8px 16px rgba(255, 153, 51, 0.4)' }}
        title={`Adicionar novo ${activeTab}`}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Document Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Novo {activeTab === 'orcamento' ? 'Orçamento' : 'Contrato'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                  Título do Documento
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sonorização Evento Corporativo Arthur"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                  Cliente Solicitante
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Roberto Carlos Eventos"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Valor Fechado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Data Limite / Execução
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-secondary-dark"
                >
                  Criar {activeTab === 'orcamento' ? 'Orçamento' : 'Contrato'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
