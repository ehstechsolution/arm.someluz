import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Power, 
  Info, 
  Briefcase, 
  TrendingUp, 
  UserCheck, 
  Coins, 
  Layers, 
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import { PackageCombo, Equipment, TeamMember, PackageEquipment, PackageTeamMember } from '../types';
import { INITIAL_EQUIPMENT, INITIAL_TEAM } from '../data';
import { getFirebaseDb, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function PackagesScreen() {
  const [packagesList, setPackagesList] = useState<PackageCombo[]>([]);
  const [equipmentsList, setEquipmentsList] = useState<Equipment[]>([]);
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Panel open
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View Modals State
  const [selectedPackage, setSelectedPackage] = useState<PackageCombo | null>(null);
  const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);

  // Core Form fields
  const [formTitulo, setFormFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formEquipamentos, setFormEquipamentos] = useState<PackageEquipment[]>([]);
  const [formEquipeTecnica, setFormEquipeTecnica] = useState<PackageTeamMember[]>([]);
  const [formPrecoVenda, setFormPrecoVenda] = useState('');

  // Equipment selection helpers
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');

  // Crew Technical Staff helpers
  const [selectedStaffFuncao, setSelectedStaffFuncao] = useState('');
  const [customDiariaRate, setCustomDiariaRate] = useState('');
  const [staffQuantity, setStaffQuantity] = useState(1);

  // Interactive UI indicators & toast messages
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // 1. Fetch available Equipments
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      const unsub = onSnapshot(collection(db, 'equipamentos'), (snapshot) => {
        const eList: Equipment[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          eList.push({
            id: doc.id,
            categoria: d.categoria || 'Sonorização',
            nome: d.nome || 'Sem Nome',
            descricao: d.descricao || '',
            foto_url: d.foto_url || '',
            fotos: d.fotos || (d.foto_url ? [d.foto_url] : []),
            foto_capa_url: d.foto_capa_url || d.foto_url || '',
            preco: Number(d.preco || 0),
            ativo: d.ativo !== false,
            is_kit: d.is_kit === true,
            componentes: d.componentes || []
          });
        });
        setEquipmentsList(eList);
      }, (err) => {
        console.warn("Firestore error listening to active equipment stash, using fallback INITIAL_EQUIPMENT", err);
        setEquipmentsList(INITIAL_EQUIPMENT);
      });
      return () => unsub();
    } else {
      setEquipmentsList(INITIAL_EQUIPMENT);
    }
  }, []);

  // 2. Fetch technical team members (funcionarios)
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      const unsub = onSnapshot(collection(db, 'funcionarios'), (snapshot) => {
        const tList: TeamMember[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          tList.push({
            id: doc.id,
            nome: d.nome || 'Sem Nome',
            funcao: d.funcao || 'Técnico',
            diaria: Number(d.diaria || 0),
            foto_url: d.foto_url || '',
            ativo: d.ativo !== false,
            usuario_id: d.usuario_id || null
          });
        });
        setTeamList(tList);
      }, (err) => {
        console.warn("Firestore error listening to crew database, using fallback INITIAL_TEAM", err);
        setTeamList(INITIAL_TEAM);
      });
      return () => unsub();
    } else {
      setTeamList(INITIAL_TEAM);
    }
  }, []);

  // 3. Real-time sub to packages (pacotes)
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      setIsLoading(true);
      const unsub = onSnapshot(collection(db, 'pacotes'), (snapshot) => {
        const list: PackageCombo[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Backwards compatibility fallbacks
          const finalTitulo = data.titulo || data.nome || 'Pacote Comercial';
          const finalPrecoCusto = Number(data.preco_custo_base || 0);
          const finalPrecoVenda = Number(data.preco_venda || data.preco || 0);
          const legacyItems = data.itens || [];
          
          // Fallback legacy items if equipments is empty
          let resolvedEquipos: PackageEquipment[] = data.equipamentos || [];
          if (resolvedEquipos.length === 0 && legacyItems.length > 0) {
            resolvedEquipos = legacyItems.map((itm: any) => ({
              equipamento_id: itm.equipamento_id,
              nome: itm.nome || 'Equipamento',
              categoria: 'Sonorização',
              quantidade: Number(itm.quantidade || 1),
              preco_aluguel_unitario: Number(itm.preco_unitario || 0)
            }));
          }

          list.push({
            id: doc.id,
            titulo: finalTitulo,
            descricao: data.descricao || '',
            ativo: data.ativo !== false,
            preco_custo_base: finalPrecoCusto,
            preco_venda: finalPrecoVenda,
            criado_em: data.criado_em || data.atualizado_em || new Date().toISOString(),
            equipe_tecnica: data.equipe_tecnica || [],
            equipamentos: resolvedEquipos
          });
        });
        setPackagesList(list);
        setIsLoading(false);
      }, (err) => {
        console.error("Firestore error reading packages list:", err);
        setIsLoading(false);
        showToast('error', 'Sem permissão para ler pacotes no Firestore.');
      });
      return () => unsub();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Extract unique technical professions from technicians list for easy selection
  const staffRolesAndRates = useMemo(() => {
    const map = new Map<string, number>();

    // ONLY populate with actual records in active database staff (teamList)
    teamList.forEach(m => {
      if (m.ativo !== false && m.funcao && m.diaria) {
        map.set(m.funcao.trim(), Number(m.diaria));
      }
    });

    return Array.from(map.entries()).map(([funcao, diaria]) => ({
      funcao,
      diaria
    }));
  }, [teamList]);

  // Set default value for roles rate when role is changed
  useEffect(() => {
    if (selectedStaffFuncao) {
      const match = staffRolesAndRates.find(r => r.funcao === selectedStaffFuncao);
      if (match) {
        setCustomDiariaRate(match.diaria.toString());
      }
    }
  }, [selectedStaffFuncao, staffRolesAndRates]);

  // Reactive price calculator using reduce hooks (Requisito 1)
  const reactiveBaseCost = useMemo(() => {
    const equipmentsCost = formEquipamentos.reduce((sum, item) => {
      return sum + (Number(item.quantidade || 0) * Number(item.preco_aluguel_unitario || 0));
    }, 0);

    const teamCost = formEquipeTecnica.reduce((sum, item) => {
      return sum + (Number(item.quantidade || 0) * Number(item.custo_diaria || 0));
    }, 0);

    return equipmentsCost + teamCost;
  }, [formEquipamentos, formEquipeTecnica]);

  // Toggle active toggle directly on-card
  const handleToggleActiveCard = async (combo: PackageCombo) => {
    const updated = {
      ...combo,
      ativo: !combo.ativo
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'pacotes', combo.id), {
          titulo: updated.titulo,
          descricao: updated.descricao,
          ativo: updated.ativo,
          preco_custo_base: updated.preco_custo_base,
          preco_venda: updated.preco_venda,
          criado_em: updated.criado_em,
          equipe_tecnica: updated.equipe_tecnica,
          equipamentos: updated.equipamentos
        });
        showToast('success', `Pacote "${updated.titulo}" ${updated.ativo ? 'ativado' : 'desativado'} com sucesso.`);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `pacotes/${combo.id}`);
        showToast('error', 'Falha ao alterar status comercial.');
      }
    } else {
      setPackagesList(prev => prev.map(p => p.id === combo.id ? updated : p));
      showToast('success', 'Status modificado localmente.');
    }
  };

  // Delete Package
  const handleDeletePackage = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza de que realmente deseja excluir definitivamente o pacote comercial "${title}"?`)) {
      const db = getFirebaseDb();
      if (db) {
        try {
          await deleteDoc(doc(db, 'pacotes', id));
          showToast('success', `Pacote "${title}" apagado com sucesso.`);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `pacotes/${id}`);
          showToast('error', 'Apenas administradores podem excluir pacotes.');
        }
      } else {
        setPackagesList(prev => prev.filter(p => p.id !== id));
        showToast('success', 'Pacote comercial excluído localmente.');
      }
    }
  };

  // Add Equipment to list
  const handleModifyEquipQuantity = (eq: Equipment, delta: number) => {
    const existing = formEquipamentos.find(item => item.equipamento_id === eq.id);

    if (existing) {
      const newQty = existing.quantidade + delta;
      if (newQty <= 0) {
        setFormEquipamentos(prev => prev.filter(item => item.equipamento_id !== eq.id));
      } else {
        setFormEquipamentos(prev => prev.map(item => 
          item.equipamento_id === eq.id ? { ...item, quantidade: newQty } : item
        ));
      }
    } else if (delta > 0) {
      setFormEquipamentos(prev => [
        ...prev,
        {
          equipamento_id: eq.id,
          nome: eq.nome,
          categoria: eq.categoria,
          quantidade: delta,
          preco_aluguel_unitario: eq.preco
        }
      ]);
    }
  };

  // Add Technical Staff to list
  const handleAddTechnicalStaff = () => {
    setErrorMsg('');
    if (!selectedStaffFuncao) {
      setErrorMsg('Selecione uma função do staff para adicionar.');
      return;
    }

    const rate = Number(customDiariaRate);
    if (isNaN(rate) || rate < 0) {
      setErrorMsg('Insira um custo de diária comercial válido.');
      return;
    }

    if (staffQuantity <= 0) {
      setErrorMsg('Selecione pelo menos 1 profissional.');
      return;
    }

    const exists = formEquipeTecnica.find(item => item.funcao === selectedStaffFuncao);

    if (exists) {
      setFormEquipeTecnica(prev => prev.map(item => 
        item.funcao === selectedStaffFuncao 
          ? { ...item, quantidade: item.quantidade + staffQuantity, custo_diaria: rate }
          : item
      ));
    } else {
      setFormEquipeTecnica(prev => [
        ...prev,
        {
          funcao: selectedStaffFuncao,
          quantidade: staffQuantity,
          custo_diaria: rate
        }
      ]);
    }

    // Reset helpers
    setSelectedStaffFuncao('');
    setCustomDiariaRate('');
    setStaffQuantity(1);
    showToast('success', 'Profissional técnico adicionado ao pacote.');
  };

  // Remove Technical Staff from list
  const handleRemoveTechnicalStaff = (funcao: string) => {
    setFormEquipeTecnica(prev => prev.filter(item => item.funcao !== funcao));
  };

  // Open Create mode
  const handleOpenCreateMode = () => {
    setEditingId(null);
    setFormFormTitulo('');
    setFormDescricao('');
    setFormAtivo(true);
    setFormEquipamentos([]);
    setFormEquipeTecnica([]);
    setFormPrecoVenda('');
    setSelectedStaffFuncao('');
    setCustomDiariaRate('');
    setStaffQuantity(1);
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Open Edit Mode
  const handleOpenEditMode = (combo: PackageCombo) => {
    setEditingId(combo.id);
    setFormFormTitulo(combo.titulo);
    setFormDescricao(combo.descricao || '');
    setFormAtivo(combo.ativo);
    setFormEquipamentos(combo.equipamentos || []);
    setFormEquipeTecnica(combo.equipe_tecnica || []);
    setFormPrecoVenda(combo.preco_venda.toString());
    setSelectedStaffFuncao('');
    setCustomDiariaRate('');
    setStaffQuantity(1);
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Form Submit Execution
  const handleSavePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formTitulo.trim()) {
      setErrorMsg('O título do pacote é obrigatório.');
      return;
    }

    const finalPrecoVenda = Number(formPrecoVenda);
    if (isNaN(finalPrecoVenda) || finalPrecoVenda < 0) {
      setErrorMsg('Configure um preço de venda comercial válido.');
      return;
    }

    setIsSaving(true);
    const resolvedId = editingId || 'pacote_' + Date.now();

    const payload: PackageCombo = {
      id: resolvedId,
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim(),
      ativo: formAtivo,
      preco_custo_base: reactiveBaseCost,
      preco_venda: finalPrecoVenda,
      criado_em: editingId 
        ? (packagesList.find(p => p.id === editingId)?.criado_em || new Date().toISOString()) 
        : new Date().toISOString(),
      equipe_tecnica: formEquipeTecnica,
      equipamentos: formEquipamentos
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'pacotes', resolvedId), {
          titulo: payload.titulo,
          descricao: payload.descricao,
          ativo: payload.ativo,
          preco_custo_base: payload.preco_custo_base,
          preco_venda: payload.preco_venda,
          criado_em: payload.criado_em,
          equipe_tecnica: payload.equipe_tecnica,
          equipamentos: payload.equipamentos
        });

        // Send POST webhook containing package data and { origem: "pacote" }
        try {
          await fetch('https://webhook.ehstech.com.br/webhook/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...payload,
              origem: 'pacote'
            })
          });
        } catch (webErr) {
          console.error("Erro ao enviar webhook de pacote:", webErr);
        }

        showToast('success', `Pacote "${payload.titulo}" salvo com sucesso.`);
        setIsPanelOpen(false);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `pacotes/${resolvedId}`);
        setErrorMsg('Falha de escrita no banco. Tente novamente.');
      } finally {
        setIsSaving(false);
      }
    } else {
      let updated;
      if (editingId) {
        updated = packagesList.map(p => p.id === editingId ? payload : p);
      } else {
        updated = [...packagesList, payload];
      }
      setPackagesList(updated);

      // Send POST webhook containing package data and { origem: "pacote" } (local sandbox branch)
      try {
        await fetch('https://webhook.ehstech.com.br/webhook/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...payload,
            origem: 'pacote'
          })
        });
      } catch (webErr) {
        console.error("Erro ao enviar webhook de pacote:", webErr);
      }

      showToast('success', 'Pacote salvo localmente no sandbox.');
      setIsPanelOpen(false);
      setIsSaving(false);
    }
  };

  // Filtered equipment browse list
  const browseEquipmentsList = useMemo(() => {
    return equipmentsList.filter(eq => {
      if (!eq.ativo) return false;
      const matchSearch = eq.nome.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) || 
                          eq.categoria.toLowerCase().includes(equipmentSearchQuery.toLowerCase());
      
      if (activeCategoryFilter === 'Todos') return matchSearch;
      return matchSearch && eq.categoria === activeCategoryFilter;
    });
  }, [equipmentsList, activeCategoryFilter, equipmentSearchQuery]);

  // Filter package configurations on screen
  const mainFilteredPackages = useMemo(() => {
    return packagesList.filter(p => {
      const q = searchQuery.toLowerCase();
      return p.titulo.toLowerCase().includes(q) || 
             p.descricao.toLowerCase().includes(q);
    });
  }, [packagesList, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Toast notifications */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.type === 'success' 
                ? 'bg-[#A3E635]/15 text-[#A3E635] border-[#A3E635]/40 backdrop-blur-md'
                : toast.type === 'error'
                  ? 'bg-orange-500/15 text-orange-500 border-orange-500/40 backdrop-blur-md'
                  : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/40 backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' && <Check className="h-4 w-4 shrink-0 stroke-[2.5]" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />}
            {toast.type === 'warning' && <Info className="h-4 w-4 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section (Design System) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#A3E635] bg-[#A3E635]/10 px-2.5 py-1 rounded-full border border-[#A3E635]/20">
            ARM Som e Luz · Comercial
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white mt-1.5 tracking-tight">
            Gerenciamento de Pacotes
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Formule propostas e kits fechados combinando instantaneamente o acervo técnico de Som, Luz, Imagem e a Diária da equipe profissional em um cálculo reativo de alta margem de lucro.
          </p>
        </div>

        <button
          onClick={handleOpenCreateMode}
          className="active-click flex h-11 items-center justify-center gap-2 rounded-xl bg-[#A3E635] text-xs font-black text-gray-950 transition-all hover:bg-[#92d02a] px-5 shadow-lg shadow-[#A3E635]/20"
        >
          <Plus className="h-4.5 w-4.5 stroke-[3]" />
          <span>+ Criar Novo Pacote</span>
        </button>
      </div>

      {/* Query search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar pacote por título comercial, acervo ou palavras-chave..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-xs text-gray-950 dark:border-zinc-850 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#A3E635] dark:focus:border-[#A3E635] font-semibold"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid listing packages (Design System theme tags) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-gray-150 rounded-3xl dark:border-zinc-800 bg-zinc-50/20">
          <RefreshCw className="h-7 w-7 text-[#A3E635] animate-spin" />
          <span className="text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest leading-none">Acessando acervo de pacotes ARM...</span>
        </div>
      ) : mainFilteredPackages.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-155 rounded-3xl bg-zinc-50/10 dark:border-zinc-850 dark:bg-zinc-950/20">
          <Package className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto stroke-1 mb-2" />
          <p className="text-xs font-bold text-gray-550 dark:text-zinc-450">Nenhum pacote de eventos cadastrado</p>
          <p className="text-[10px] text-gray-405 mt-0.5">Monte um combo reativo para eventos clicando no botão no topo direito.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mainFilteredPackages.map((combo) => {
            const marginAmount = combo.preco_venda - combo.preco_custo_base;
            const marginPercent = combo.preco_custo_base > 0 ? (marginAmount / combo.preco_custo_base) * 105 : 0;
            return (
              <div
                key={combo.id}
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-200 hover:shadow-md dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-850 ${
                  !combo.ativo ? 'opacity-60' : ''
                }`}
              >
                {/* Header card body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between" onClick={() => setSelectedPackage(combo)}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase ${
                        combo.ativo ? 'bg-[#A3E635]/15 text-[#A3E635] dark:text-[#A3E635]' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {combo.ativo ? '● Ativo Comercial' : '● Inativo / Rascunho'}
                      </span>
                      
                      <span className="text-[9px] font-bold text-gray-400 font-mono">
                        {combo.criado_em ? new Date(combo.criado_em).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                      {combo.titulo}
                    </h3>
                    
                    {combo.descricao && (
                      <p className="text-xs text-gray-550 dark:text-zinc-400 line-clamp-3 leading-relaxed font-semibold">
                        {combo.descricao}
                      </p>
                    )}
                  </div>

                  {/* Included list details */}
                  <div className="space-y-2.5 pt-1">
                    {/* Equipments chips summary */}
                    {combo.equipamentos && combo.equipamentos.length > 0 ? (
                      <div>
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">
                          Equipamentos ({combo.equipamentos.reduce((s, x) => s + x.quantidade, 0)}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {combo.equipamentos.map((eq, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-700 bg-gray-50 rounded-lg px-2 py-0.5 border border-gray-150/50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-750"
                            >
                              <span className="text-[#A3E635] font-extrabold">{eq.quantidade}x</span>
                              <span className="truncate max-w-[120px]">{eq.nome}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Team Staff members summary */}
                    {combo.equipe_tecnica && combo.equipe_tecnica.length > 0 ? (
                      <div className="pt-1.5 border-t border-dashed border-gray-100 dark:border-zinc-800/60">
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">
                          Equipe Técnica ({combo.equipe_tecnica.reduce((s, x) => s + x.quantidade, 0)}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {combo.equipe_tecnica.map((tm, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50/50 rounded-lg px-2 py-0.5 border border-orange-200/20 dark:bg-orange-500/5 dark:text-orange-400"
                            >
                              <span className="font-extrabold text-[#F97316]">{tm.quantidade}x</span>
                              <span className="truncate max-w-[120px]">{tm.funcao}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Cost base vs sales final finance box */}
                  <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-2 gap-3 bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-gray-150/40 dark:border-zinc-850/50">
                    <div>
                      <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-widest block leading-none">Preço de Custo</span>
                      <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 font-mono">
                        {combo.preco_custo_base.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[8px] text-[#F97316] font-black uppercase tracking-widest block leading-none">Venda Comercial</span>
                      <span className="text-sm font-black text-[#A3E635] font-mono block leading-tight">
                        {combo.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {combo.preco_venda > combo.preco_custo_base && (
                      <div className="col-span-2 pt-1 border-t border-dashed border-gray-150 dark:border-zinc-800 flex items-center justify-between text-[9px] font-bold text-orange-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Lucro Estimado:
                        </span>
                        <span>
                          +{marginAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({marginPercent.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls strip (Lime Green highlighting / Accent alerts) */}
                <div className="bg-gray-50/50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-850 px-5 py-3 flex items-center justify-between gap-1.5/md">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActiveCard(combo)}
                      className={`p-2 rounded-xl border transition-colors ${
                        combo.ativo
                          ? 'border-gray-200 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 dark:border-zinc-850 dark:text-zinc-400'
                          : 'border-[#A3E635]/30 bg-[#A3E635]/10 text-[#A3E635] hover:bg-[#A3E635]/20'
                      }`}
                      title={combo.ativo ? 'Inativar comercialmente' : 'Reativar comercialmente'}
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditMode(combo)}
                      className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-zinc-850 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="Editar Pacote"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePackage(combo.id, combo.titulo)}
                    className="p-2 rounded-xl border border-red-100/50 text-red-500 hover:bg-red-500/10 dark:border-red-950/20"
                    title="Excluir combo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Panel / Drawer for Package Compositing */}
      <AnimatePresence>
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs"
            />

            <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="w-screen max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800"
              >
                {/* Header title */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black text-[#A3E635] tracking-widest block leading-none">ARM Som e Luz</span>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 leading-none">
                      {editingId ? 'Editar Pacote Comercial' : 'Compor Novo Pacote de Serviços'}
                    </h3>
                  </div>

                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Validation alert banner */}
                {errorMsg && (
                  <div className="m-6 mb-0 flex items-start gap-2.5 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-orange-500 stroke-[2.5]" />
                    <p>{errorMsg}</p>
                  </div>
                )}

                {/* Drawer scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Basic settings layout */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest border-b border-gray-100 dark:border-zinc-800 pb-1.5">
                      1. Informações do Pacote
                    </h4>

                    {/* Titulo */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] uppercase font-extrabold text-gray-500 dark:text-zinc-400">
                        Título de Referência Comercial
                      </label>
                      <input
                        type="text"
                        value={formTitulo}
                        onChange={(e) => setFormFormTitulo(e.target.value)}
                        placeholder="Ex: Combo Corporativo High Tech, Casamento Premium 150 Pessoas..."
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#A3E635] font-semibold"
                      />
                    </div>

                    {/* Descricao */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] uppercase font-extrabold text-gray-500 dark:text-zinc-400">
                        Descrição Comercial / Resumo Técnico
                      </label>
                      <textarea
                        value={formDescricao}
                        onChange={(e) => setFormDescricao(e.target.value)}
                        placeholder="Insira detalhes de montagem e facilidades de contratação para o cliente."
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#A3E635] font-semibold resize-none"
                      />
                    </div>

                    {/* iOS style active state toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 border border-gray-150/60 dark:border-zinc-850">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white">Disponível para Venda Comercial</p>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400">Define se corretores e DJs podem listar esse pacote em propostas rápidas.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormAtivo(!formAtivo)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                          formAtivo ? 'bg-[#A3E635]' : 'bg-gray-200 dark:bg-zinc-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            formAtivo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Equipamentos */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-1.5">
                      <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                        2. Equipamentos Inclusos (Lista do Acervo)
                      </h4>
                      <span className="text-[10px] bg-[#A3E635]/10 text-gray-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-bold">
                        {formEquipamentos.reduce((s, x) => s + x.quantidade, 0)} Itens Selecionados
                      </span>
                    </div>

                    {/* Search & Category Filter selector */}
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Pesquisar nos equipamentos..."
                            value={equipmentSearchQuery}
                            onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                            className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#A3E635] font-semibold"
                          />
                        </div>
                      </div>

                      {/* Horizontal scroll select category tabs */}
                      <div className="flex overflow-x-auto pb-1 gap-1 select-none scrollbar-none">
                        {['Todos', 'Sonorização', 'Iluminação', 'Estruturas', 'Paineis e Pistas'].map((cat) => {
                          const isActive = activeCategoryFilter === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setActiveCategoryFilter(cat)}
                              className={`py-1 px-3 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all tracking-tight shrink-0 border ${
                                isActive 
                                  ? 'bg-[#A3E635] text-gray-950 border-[#A3E635]' 
                                  : 'text-gray-500 border-gray-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive browse grid */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/30 p-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-850 max-h-52 overflow-y-auto space-y-1">
                      {browseEquipmentsList.length === 0 ? (
                        <p className="text-[10px] text-gray-400 text-center py-5 italic font-medium">Nenhum equipamento correspondente nesta categoria.</p>
                      ) : (
                        browseEquipmentsList.map((eq) => {
                          const savedItem = formEquipamentos.find(item => item.equipamento_id === eq.id);
                          const quantity = savedItem ? savedItem.quantidade : 0;
                          return (
                            <div 
                              key={eq.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-gray-900 dark:text-white truncate leading-tight">{eq.nome}</p>
                                <p className="text-[10px] text-gray-400 font-medium font-mono">
                                  {eq.categoria} · {eq.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/unidade
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {quantity > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleModifyEquipQuantity(eq, -1)}
                                    className="text-gray-400 hover:text-red-500 rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-zinc-950/20 transition-colors"
                                  >
                                    <MinusCircle className="h-4.5 w-4.5" />
                                  </button>
                                )}

                                <span className={`w-6 text-center font-mono font-black ${quantity > 0 ? 'text-[#A3E635]' : 'text-gray-300'}`}>
                                  {quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleModifyEquipQuantity(eq, 1)}
                                  className="text-gray-400 hover:text-[#A3E635] rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-zinc-950/20 transition-colors"
                                >
                                  <PlusCircle className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Equipments "Tabela/Itens Inclusos" */}
                    {formEquipamentos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9.5px] uppercase font-black tracking-widest text-[#A3E635]">Lista de Equipamentos Vinculados</span>
                        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-400 text-[9px] uppercase font-extrabold tracking-wider border-b border-gray-150 dark:border-zinc-800">
                              <tr>
                                <th className="p-3">Equipamento</th>
                                <th className="p-3 text-center">Qtd</th>
                                <th className="p-3 text-right">Aluguel Unit.</th>
                                <th className="p-3 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formEquipamentos.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100 dark:border-zinc-850/50 hover:bg-gray-50/50">
                                  <td className="p-3 font-semibold dark:text-white">{item.nome}</td>
                                  <td className="p-3 text-center font-mono font-bold text-gray-600 dark:text-zinc-400">{item.quantidade}</td>
                                  <td className="p-3 text-right font-mono text-gray-500">{item.preco_aluguel_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                  <td className="p-3 text-right font-mono font-bold text-[#A3E635]">{(item.quantidade * item.preco_aluguel_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Equipe Técnica (Staff) */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-1.5">
                      <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                        3. Equipe Técnica Necessária (Staff)
                      </h4>
                      <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-md font-bold">
                        {formEquipeTecnica.reduce((s, x) => s + x.quantidade, 0)} Profissionais Alocados
                      </span>
                    </div>

                    {/* Selector inputs row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30">
                      
                      {/* Function select drop down */}
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[9.5px] uppercase font-bold text-gray-400">Cargo / Função do Técnico</label>
                        <select
                          value={selectedStaffFuncao}
                          onChange={(e) => setSelectedStaffFuncao(e.target.value)}
                          className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2 text-gray-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-bold"
                        >
                          <option value="">Selecione uma especialidade...</option>
                          {staffRolesAndRates.map((role, idx) => (
                            <option key={idx} value={role.funcao}>{role.funcao}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cost value */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[9.5px] uppercase font-bold text-gray-400">Custo da Diária (R$)</label>
                        <input
                          type="number"
                          value={customDiariaRate}
                          onChange={(e) => setCustomDiariaRate(e.target.value)}
                          placeholder="250"
                          className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2 text-gray-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono font-bold"
                        />
                      </div>

                      {/* Quantity selector */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9.5px] uppercase font-bold text-gray-400 block text-center">Qtd</label>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStaffQuantity(Math.max(1, staffQuantity - 1))}
                            className="text-gray-400 hover:text-[#A3E635]"
                          >
                            <MinusCircle className="h-4.5 w-4.5" />
                          </button>
                          <span className="text-xs font-mono font-black w-4 text-center">{staffQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setStaffQuantity(staffQuantity + 1)}
                            className="text-gray-400 hover:text-[#A3E635]"
                          >
                            <PlusCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* Add button trigger */}
                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddTechnicalStaff}
                          className="w-full h-8.5 bg-zinc-900 text-white rounded-lg hover:bg-black dark:bg-zinc-100 dark:text-gray-950 flex items-center justify-center text-xs font-bold transition-opacity"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {/* List of included staff in package */}
                    {formEquipeTecnica.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[9.5px] uppercase font-black tracking-widest text-[#F97316]">Composição Técnico / Staff</span>
                        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-[#F97316]/5 text-gray-400 text-[9px] uppercase font-extrabold tracking-wider border-b border-gray-150 dark:border-zinc-800">
                              <tr>
                                <th className="p-3">Especialidade / Função</th>
                                <th className="p-3 text-center">Profissionais</th>
                                <th className="p-3 text-right">Diária Individual</th>
                                <th className="p-3 text-right">Subtotal</th>
                                <th className="p-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {formEquipeTecnica.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100 dark:border-zinc-850/50 hover:bg-gray-50/50">
                                  <td className="p-3 font-semibold dark:text-white">{item.funcao}</td>
                                  <td className="p-3 text-center font-mono font-bold text-gray-600 dark:text-zinc-400">{item.quantidade}</td>
                                  <td className="p-3 text-right font-mono text-gray-500">{item.custo_diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                  <td className="p-3 text-right font-mono font-bold text-orange-500">{(item.quantidade * item.custo_diaria).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTechnicalStaff(item.funcao)}
                                      className="text-red-500 hover:text-red-700 rounded-full p-1 border border-transparent hover:border-red-100 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-2.5 bg-zinc-50 dark:bg-zinc-950/20 border border-gray-150 rounded-xl font-mono italic">
                        Nenhum profissional técnico configurado para esse pacote.
                      </p>
                    )}
                  </div>
                </div>

                {/* Sticky Footer of Drawer (Laranja Vibrante for calculations / Requisito 2) */}
                <div className="sticky bottom-0 bg-zinc-950 dark:bg-black p-5 border-t border-zinc-800 flex flex-col gap-4 text-white">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Computed reactive base cost */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#F97316]">
                        Preço de Custo Base (Calculado)
                      </span>
                      <div className="text-base sm:text-lg font-black font-mono text-gray-100 flex items-center gap-1">
                        <Coins className="h-4 w-4 text-gray-400" />
                        {reactiveBaseCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>

                    {/* Editable Commercial Selling Price */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-lime-400 flex items-center gap-1 select-none">
                        Preço de Venda Final
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono text-[#A3E635]">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formPrecoVenda}
                          onChange={(e) => setFormPrecoVenda(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs font-black font-mono bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 pl-7 text-[#A3E635] outline-none tracking-tight focus:border-[#A3E635]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profit projections readout */}
                  {Number(formPrecoVenda) > reactiveBaseCost && (
                    <div className="flex justify-between items-center bg-[#A3E635]/10 border border-[#A3E635]/20 p-2.5 rounded-xl text-[10px] font-bold text-[#A3E635]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Aderência Comercial: Alta Margem de Lucro Detectada (+R$ {(Number(formPrecoVenda) - reactiveBaseCost).toFixed(2)})
                      </span>
                      <span className="font-mono bg-[#A3E635]/20 text-white px-1.5 py-0.5 rounded">
                        +{(( (Number(formPrecoVenda) - reactiveBaseCost) / (reactiveBaseCost || 1) ) * 105).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Submission row */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPanelOpen(false)}
                      className="flex-1 h-11 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl font-bold text-xs transition-colors"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePackageSubmit}
                      disabled={isSaving}
                      className="flex-1 h-11 rounded-xl bg-[#A3E635] text-gray-950 hover:bg-[#86c026] text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-[#A3E635]/15 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Gravando dados...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Salvar Pacote da ARM</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modals - Stacked */}
      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPackage(null)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black">{selectedPackage.titulo}</h3>
              <p className="text-sm mt-2 text-gray-500 dark:text-zinc-400">{selectedPackage.descricao}</p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Equipe Técnica Inclusa</h4>
                  <ul className="space-y-1">
                    {selectedPackage.equipe_tecnica.map((e, i) => (
                      <li key={i} className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-zinc-950">
                        <span className="font-bold">{e.funcao}</span>
                        <span className="font-mono font-bold text-[#F97316]">{e.quantidade}x</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Equipamentos Inclusos</h4>
                  <ul className="space-y-1">
                    {selectedPackage.equipamentos.map((e, i) => {
                      const eq = equipmentsList.find(item => item.id === e.equipamento_id);
                      const imgSrc = eq?.foto_capa_url || eq?.foto_url;
                      return (
                        <li 
                          key={i} 
                          className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg bg-gray-50 dark:bg-zinc-950 cursor-pointer hover:bg-[#A3E635]/10 group transition-colors"
                          onClick={() => setSelectedEquipId(e.equipamento_id)}
                        >
                          <div className="flex items-center gap-3">
                            {imgSrc ? (
                              <img src={imgSrc} alt={e.nome} className="w-8 h-8 rounded-md object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                            )}
                            <span className="font-bold group-hover:text-[#A3E635]">{e.nome}</span>
                          </div>
                          <span className="font-mono font-bold text-[#A3E635]">{e.quantidade}x</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEquipId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEquipId(null)} className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6">
              {(() => {
                const eq = equipmentsList.find(e => e.id === selectedEquipId);
                if (!eq) return <div className="text-red-500">Equipamento não encontrado.</div>;
                return (
                  <>
                    <h3 className="text-base font-black">{eq.nome}</h3>
                    <div className="mt-3 aspect-video bg-zinc-100 rounded-lg overflow-hidden">
                      <img src={eq.foto_capa_url || eq.foto_url} alt={eq.nome} className="w-full h-full object-cover" />
                    </div>
                    <p className="mt-4 text-xs text-gray-500">{eq.descricao}</p>
                    <button onClick={() => setSelectedEquipId(null)} className="mt-6 w-full p-2 bg-gray-200 dark:bg-zinc-800 rounded-lg text-xs font-bold">Fechar</button>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
