import React, { useState, useEffect, useRef } from 'react';
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
  ListPlus, 
  DollarSign, 
  Upload, 
  Sparkles,
  Layers,
  HelpCircle,
  Hash
} from 'lucide-react';
import { PackageCombo, Equipment } from '../types';
import { getFirebaseDb, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function PackagesScreen() {
  const [packagesList, setPackagesList] = useState<PackageCombo[]>([]);
  const [equipmentsList, setEquipmentsList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');

  // Form Panel toggles
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Core Form fields
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formPreco, setFormPreco] = useState('');
  const [formCategoria, setFormCategoria] = useState<'Completo' | 'Som' | 'Som & Luz' | 'Iluminação' | 'Efeitos Especiais'>('Completo');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formItens, setFormItens] = useState<{ equipamento_id: string; quantidade: number; nome?: string }[]>([]);

  // Temporary selectors for adding items to the combo package
  const [tempEquipId, setTempEquipId] = useState('');
  const [tempQuant, setTempQuant] = useState('1');

  // Interactive UI messages
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // 1. Fetch available equipments (equipamentos) to select items for build
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
            preco: Number(d.preco || 0),
            ativo: d.ativo !== false,
            is_kit: d.is_kit === true,
            componentes: d.componentes || []
          });
        });
        setEquipmentsList(eList);
      }, (err) => {
        console.warn("Firestore error listening to active equipment stash inside Packages:", err);
      });
      return () => unsub();
    }
  }, []);

  // 2. Real-time sub to packages (pacotes)
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      setIsLoading(true);
      const unsub = onSnapshot(collection(db, 'pacotes'), (snapshot) => {
        const list: PackageCombo[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            nome: data.nome || '',
            descricao: data.descricao || '',
            preco: Number(data.preco || 0),
            categoria: data.categoria || 'Completo',
            foto_url: data.foto_url || '',
            ativo: data.ativo !== false,
            itens: data.itens || [],
            atualizado_em: data.atualizado_em || null
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

  // Fast switch active status toggle
  const handleToggleActive = async (combo: PackageCombo) => {
    const updated = {
      ...combo,
      ativo: !combo.ativo,
      atualizado_em: new Date().toISOString()
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'pacotes', combo.id), {
          nome: updated.nome,
          descricao: updated.descricao,
          preco: updated.preco,
          categoria: updated.categoria,
          foto_url: updated.foto_url,
          ativo: updated.ativo,
          itens: updated.itens,
          atualizado_em: updated.atualizado_em
        });
        showToast('success', `Pacote "${updated.nome}" ${updated.ativo ? 'ativado' : 'desativado'} com sucesso.`);
      } catch (err: any) {
        showToast('error', 'Alteração bloqueada pelo administrador.');
      }
    } else {
      setPackagesList(prev => prev.map(p => p.id === combo.id ? updated : p));
      showToast('success', 'Status modificado localmente.');
    }
  };

  // Remove package
  const handleDeletePackage = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja remover permanentemente o pacote "${name}" dos registros da ARM Som e Luz?`)) {
      const db = getFirebaseDb();
      if (db) {
        try {
          await deleteDoc(doc(db, 'pacotes', id));
          showToast('success', `Pacote "${name}" excluído.`);
        } catch (err: any) {
          showToast('error', 'Erro ao excluir pacote.');
        }
      } else {
        setPackagesList(prev => prev.filter(p => p.id !== id));
        showToast('success', 'Pacote excluído localmente da sandbox.');
      }
    }
  };

  // Upload Photo through Cloudinary
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'equipe');

      const response = await fetch('https://api.cloudinary.com/v1_1/dnatvwcxy/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Retorno incorreto dos servidores de mídia.');
      const data = await response.json();
      if (data.secure_url) {
        setFormFotoUrl(data.secure_url);
        showToast('success', 'Banner do pacote carregado e vinculado!');
      } else {
        throw new Error('Falha ao decodificar secure_url do banner.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao processar upload da foto do pacote.');
      showToast('error', 'Falha no upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  // Save submit form
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formNome.trim()) {
      setErrorMsg('Insira o nome de referência comercial do Pacote.');
      return;
    }

    if (!formPreco || isNaN(Number(formPreco)) || Number(formPreco) < 0) {
      setErrorMsg('Forneça um preço comercial válido.');
      return;
    }

    setIsSaving(true);
    const resolvedId = editingId || 'pacote_' + Date.now();
    const finalFoto = formFotoUrl.trim() || 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg';

    // Map the actual component name if available, for easier visual listing
    const formattedItems = formItens.map(itm => {
      const eq = equipmentsList.find(e => e.id === itm.equipamento_id);
      return {
        equipamento_id: itm.equipamento_id,
        quantidade: itm.quantidade,
        nome: eq ? eq.nome : (itm.nome || 'Acessório avulso')
      };
    });

    const payload: PackageCombo = {
      id: resolvedId,
      nome: formNome.trim(),
      descricao: formDescricao.trim(),
      preco: Number(formPreco),
      categoria: formCategoria,
      foto_url: finalFoto,
      ativo: formAtivo,
      itens: formattedItems,
      atualizado_em: new Date().toISOString()
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'pacotes', resolvedId), {
          nome: payload.nome,
          descricao: payload.descricao,
          preco: payload.preco,
          categoria: payload.categoria,
          foto_url: payload.foto_url,
          ativo: payload.ativo,
          itens: payload.itens,
          atualizado_em: payload.atualizado_em
        });
        showToast('success', `Pacote "${formNome}" salvo com sucesso!`);
        setIsPanelOpen(false);
      } catch (err: any) {
        console.error("Firestore write package error:", err);
        setErrorMsg('Erro de acesso ao banco ao salvar pacote.');
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
      showToast('success', `Pacote "${formNome}" atualizado localmente.`);
      setIsPanelOpen(false);
      setIsSaving(false);
    }
  };

  // Add item helper
  const handleAddItemToCombo = () => {
    setErrorMsg('');
    if (!tempEquipId) {
      setErrorMsg('Selecione primeiro um equipamento do inventário.');
      return;
    }

    const qty = Number(tempQuant);
    if (!qty || qty <= 0) {
      setErrorMsg('A quantidade deve ser de no mínimo 1 item.');
      return;
    }

    // Check if already in the list
    const exists = formItens.find(itm => itm.equipamento_id === tempEquipId);
    if (exists) {
      setFormItens(prev => prev.map(itm => 
        itm.equipamento_id === tempEquipId 
          ? { ...itm, quantidade: itm.quantidade + qty }
          : itm
      ));
    } else {
      const parentEq = equipmentsList.find(e => e.id === tempEquipId);
      setFormItens(prev => [
        ...prev, 
        { 
          equipamento_id: tempEquipId, 
          quantidade: qty, 
          nome: parentEq ? parentEq.nome : 'Equipamento' 
        }
      ]);
    }
    setTempEquipId('');
    setTempQuant('1');
  };

  // Remove item from custom combo list
  const handleRemoveItemFromCombo = (equipId: string) => {
    setFormItens(prev => prev.filter(itm => itm.equipamento_id !== equipId));
  };

  // Set default form values for creation
  const openCreateMode = () => {
    setEditingId(null);
    setFormNome('');
    setFormDescricao('');
    setFormPreco('');
    setFormCategoria('Completo');
    setFormFotoUrl('');
    setFormAtivo(true);
    setFormItens([]);
    setTempEquipId('');
    setTempQuant('1');
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Populate edit fields
  const openEditMode = (combo: PackageCombo) => {
    setEditingId(combo.id);
    setFormNome(combo.nome);
    setFormDescricao(combo.descricao);
    setFormPreco(combo.preco.toString());
    setFormCategoria(combo.categoria);
    setFormFotoUrl(combo.foto_url);
    setFormAtivo(combo.ativo);
    setFormItens(combo.itens || []);
    setTempEquipId('');
    setTempQuant('1');
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Calculate standard estimate from equipment prices
  const handleCalculateEstimatedComboPrice = () => {
    let sum = 0;
    formItens.forEach(itm => {
      const eq = equipmentsList.find(e => e.id === itm.equipamento_id);
      if (eq) {
        sum += (eq.preco * itm.quantidade);
      }
    });

    if (sum > 0) {
      setFormPreco(sum.toString());
      showToast('warning', `Preço recalculado do inventário: R$ ${sum.toLocaleString('pt-BR')}`);
    } else {
      showToast('error', 'Adicione alguns equipamentos ao pacote antes de calcular.');
    }
  };

  // Filter package configurations
  const filteredCombos = packagesList.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchSearch = p.nome.toLowerCase().includes(query) || 
                        p.descricao.toLowerCase().includes(query) ||
                        p.categoria.toLowerCase().includes(query);

    if (activeCategoryFilter === 'Todos') return matchSearch;
    return matchSearch && p.categoria === activeCategoryFilter;
  });

  const getCatColorClass = (cat: string) => {
    switch (cat) {
      case 'Completo':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Som':
        return 'bg-[#7CFF01]/10 text-[#7CFF01] border-[#7CFF01]/20';
      case 'Som & Luz':
        return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      case 'Iluminação':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Toast popup */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.type === 'success' 
                ? 'bg-[#7CFF01]/10 text-[#7CFF01] border-[#7CFF01]/30 backdrop-blur-md'
                : toast.type === 'error'
                  ? 'bg-orange-500/10 text-orange-500 border-orange-500/30 backdrop-blur-md'
                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' && <Check className="h-4 w-4 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toast.type === 'warning' && <Info className="h-4 w-4 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#7CFF01] bg-[#7CFF01]/10 px-2.5 py-1 rounded-full border border-[#7CFF01]/20">
            Pacotes e Combos Pré-Montados
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white mt-1.5 tracking-tight">
            Gerenciamento de Pacotes
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Configure combos fechados de som, luz e efeitos para facilitar a criação rápida de orçamentos e contratos de festas.
          </p>
        </div>

        <button
          onClick={openCreateMode}
          className="active-click flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7CFF01] text-xs font-black text-gray-950 transition-all hover:bg-[#6edc01] px-5 shadow-lg shadow-[#7CFF01]/10"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Novo Pacote de Festa</span>
        </button>
      </div>

      {/* Fast filter control bar */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-gray-100 dark:border-zinc-900/70">
        <div className="flex overflow-x-auto pb-1 xl:pb-0 gap-1.5 scrollbar-none select-none">
          {['Todos', 'Completo', 'Som', 'Som & Luz', 'Iluminação', 'Efeitos Especiais'].map((cat) => {
            const isActive = activeCategoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`py-1.5 px-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all tracking-tight ${
                  isActive 
                    ? 'bg-zinc-900 text-[#7CFF01] dark:bg-zinc-100 dark:text-gray-950' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Query Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar pacote por termo ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-xs text-gray-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#7CFF01] dark:focus:border-[#7CFF01] font-semibold"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Packages */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-gray-150 rounded-3xl dark:border-zinc-800 bg-zinc-50/20">
          <RefreshCw className="h-7 w-7 text-[#7CFF01] animate-spin" />
          <span className="text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest leading-none">Acessando acervo de pacotes ARM...</span>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-155 rounded-3xl bg-zinc-50/10 dark:border-zinc-850 dark:bg-zinc-950/20">
          <Package className="h-9 w-9 text-gray-300 dark:text-zinc-700 mx-auto stroke-1" />
          <p className="text-xs font-bold text-gray-550 dark:text-zinc-450 mt-2">Nenhum pacote / combo de eventos encontrado</p>
          <p className="text-[10px] text-gray-405 mt-0.5">Clique em "Novo Pacote de Festa" no topo direito para criar seu primeiro combo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredCombos.map((combo) => (
            <div
              key={combo.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition-transform duration-200 hover:shadow-md dark:bg-zinc-900/60 border-gray-150 dark:border-zinc-850/80 ${
                !combo.ativo ? 'opacity-60 grayscale-[30%]' : ''
              }`}
            >
              {/* Visual aspect preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center border-b border-gray-100 dark:border-zinc-850">
                <img
                  referrerPolicy="no-referrer"
                  src={combo.foto_url || 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'}
                  alt={combo.nome}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
                
                {/* Float level label categories */}
                <span className={`absolute top-2.5 left-2.5 rounded-full border px-2.5 py-1 text-[8.5px] font-extrabold tracking-wide uppercase leading-none backdrop-blur-md shadow-xs ${getCatColorClass(combo.categoria)}`}>
                  {combo.categoria}
                </span>

                {/* Status dot */}
                <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase ${
                  combo.ativo ? 'bg-[#7CFF01] text-zinc-950' : 'bg-orange-500 text-white'
                }`}>
                  {combo.ativo ? 'Ativo' : 'Rascunho'}
                </span>
              </div>

              {/* Package Content details block */}
              <div className="p-4.5 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-gray-900 group-hover:text-primary dark:text-white transition-colors leading-tight">
                    {combo.nome}
                  </h3>
                  
                  {combo.descricao && (
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                      {combo.descricao}
                    </p>
                  )}

                  {/* List of included items */}
                  {combo.itens && combo.itens.length > 0 ? (
                    <div className="pt-2">
                      <p className="text-[8.5px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Componentes do Pacote:</p>
                      <div className="flex flex-wrap gap-1">
                        {combo.itens.map((itm, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-700 bg-gray-100 rounded-md px-1.5 py-0.5 border border-gray-200/40 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-750"
                          >
                            <span className="text-[#7CFF01] text-[10px] font-black italic">{itm.quantidade}x</span>
                            <span className="truncate max-w-[140px]">{itm.nome || 'Item do acervo'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-orange-500 bg-orange-500/5 px-2.5 py-1 rounded-lg border border-orange-500/10 inline-flex items-center gap-1 font-bold">
                      <Info className="h-3 w-3" />
                      Sem equipamentos vinculados no combo!
                    </div>
                  )}
                </div>

                {/* Cost control strip */}
                <div className="pt-3 border-t border-gray-100 dark:border-zinc-850 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">Preço do Combo</span>
                    <span className="text-sm font-black text-[#7CFF01] font-mono leading-none">
                      {combo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* Operational triggers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(combo)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        combo.ativo
                          ? 'border-gray-200 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 dark:border-zinc-800 dark:text-zinc-400'
                          : 'border-[#7CFF01]/30 bg-[#7CFF01]/10 text-[#7CFF01]'
                      }`}
                      title={combo.ativo ? 'Inativar Pacote' : 'Ativar Pacote'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditMode(combo)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title="Editar Pacote"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePackage(combo.id, combo.nome)}
                      className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/10"
                      title="Excluir Pacote"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over form drawer panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="pointer-events-auto w-screen max-w-lg"
              >
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-800">
                  
                  {/* Title heading */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white dark:bg-zinc-900 px-6 py-5 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7CFF01] tracking-widest leading-none">ARM Orçamentos Rápidos</span>
                      <h2 className="text-md sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 leading-none">
                        {editingId ? 'Editar Pacote Comercial' : 'Compor Novo Pacote'}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsPanelOpen(false)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-150 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Form validation alert notification */}
                  {errorMsg && (
                    <div className="m-6 mb-0 flex items-start gap-2.5 bg-semibold bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                      <p>{errorMsg}</p>
                    </div>
                  )}

                  {/* Core form container */}
                  <form onSubmit={handleSaveSubmit} className="flex-1 p-6 space-y-5">
                    
                    {/* Visual Photo Banner upload block */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 block">
                        Banner / Imagem Ilustrativa do Combo
                      </label>

                      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-zinc-50/10">
                        {/* Photo Box Preview */}
                        <div className="relative shrink-0 w-28 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-250/50 dark:bg-zinc-950 dark:border-zinc-800">
                          <img
                            referrerPolicy="no-referrer"
                            src={formFotoUrl || 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'}
                            alt="Banner Preview"
                            className="w-full h-full object-cover"
                          />
                          {isUploading && (
                            <div className="absolute inset-0 bg-zinc-950/75 flex items-center justify-center">
                              <RefreshCw className="h-5 w-5 text-[#7CFF01] animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* File pick controls */}
                        <div className="flex-1 space-y-1.5 w-full text-center sm:text-left">
                          <p className="text-xs font-black text-gray-950 dark:text-white leading-tight">Escolha um banner representativo</p>
                          <p className="text-[9px] text-gray-450 dark:text-zinc-500 leading-normal">
                            Será processado instantaneamente através do upload preset `equipe` do Cloudinary.
                          </p>

                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(f);
                            }}
                          />

                          <div className="flex justify-center sm:justify-start gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="active-click flex h-7 items-center gap-1 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[10px] font-extrabold text-[#111] dark:bg-zinc-800 dark:text-zinc-200"
                            >
                              <Upload className="h-3 w-3" />
                              <span>{isUploading ? 'Enviando...' : 'Carregar Imagem'}</span>
                            </button>

                            {formFotoUrl && (
                              <button
                                type="button"
                                onClick={() => setFormFotoUrl('')}
                                className="h-7 px-2.5 rounded-lg border border-red-150 text-red-500 hover:bg-red-50 text-[10px] font-extrabold"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Nome Comercial do Pacote ou Kit
                      </label>
                      <input
                        type="text"
                        required
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: Pacote Casamento Premium Gold, Iluminação Cênica Padrão..."
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                      />
                    </div>

                    {/* Category selectors */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Categoria da Configuração comercial
                      </label>
                      <select
                        value={formCategoria}
                        onChange={(e) => setFormCategoria(e.target.value as any)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                      >
                        <option value="Completo">Completo (Luz, Som & Paineis)</option>
                        <option value="Som">Apenas Som (PA/Sub/Pistas)</option>
                        <option value="Som & Luz">Som & Luz (Combo Compacto)</option>
                        <option value="Iluminação">Apenas Iluminação (Cênica/Pista)</option>
                        <option value="Efeitos Especiais">Efeitos Especiais (Sparkles/Fumaça)</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Descrição Comercial / Itens inclusos (Resumo texto)
                      </label>
                      <textarea
                        value={formDescricao}
                        onChange={(e) => setFormDescricao(e.target.value)}
                        placeholder="Ex: Ideal para eventos de até 200 pessoas. Inclui DJ e montagem completa inclusa em perímetro urbano de Dous Córregos."
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold resize-none"
                      />
                    </div>

                    {/* MULTI_ITEM EQUIPMENTS ASSIGNER SUB-FORM */}
                    <div className="space-y-3 p-4 border border-gray-200 rounded-2xl bg-zinc-50/20 dark:border-zinc-800 dark:bg-zinc-950/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                          Equipamentos do Acervo Associados
                        </span>
                        <span className="text-[9px] text-[#7CFF01] font-bold">
                          {formItens.length} itens inclusos
                        </span>
                      </div>

                      {/* Add item dropdown inputs row */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={tempEquipId}
                          onChange={(e) => setTempEquipId(e.target.value)}
                          className="flex-1 rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-semibold"
                        >
                          <option value="">-- Selecione um equipamento --</option>
                          {equipmentsList.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.nome} ({eq.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={tempQuant}
                            onChange={(e) => setTempQuant(e.target.value)}
                            placeholder="Qtd"
                            className="w-16 rounded-xl border border-gray-200 bg-white p-2 text-center text-xs text-gray-950 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono font-bold"
                          />

                          <button
                            type="button"
                            onClick={handleAddItemToCombo}
                            className="px-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-gray-950 hover:opacity-80 flex items-center justify-center text-xs font-bold shrink-0"
                          >
                            Incluir
                          </button>
                        </div>
                      </div>

                      {/* Selected combo equipment layout mapping list */}
                      {formItens.length > 0 ? (
                        <div className="space-y-1.5 pt-1.5 border-t border-gray-100 dark:border-zinc-850">
                          {formItens.map((itm) => {
                            const eqInfo = equipmentsList.find(e => e.id === itm.equipamento_id);
                            return (
                              <div 
                                key={itm.equipamento_id}
                                className="flex items-center justify-between text-xs bg-white dark:bg-zinc-950 p-2 rounded-xl border border-gray-100 dark:border-zinc-850"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono bg-[#7CFF01]/10 text-[#7CFF01] border border-[#7CFF01]/20 font-black text-[10px] px-1.5 py-0.5 rounded-lg shrink-0">
                                    {itm.quantidade}x
                                  </span>
                                  <span className="font-bold text-gray-900 dark:text-white truncate">
                                    {eqInfo ? eqInfo.nome : (itm.nome || 'Equipamento')}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromCombo(itm.equipamento_id)}
                                  className="text-red-500 hover:text-red-750 p-1 rounded-sm dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-550 text-center py-2 italic font-mono">
                          Nenhum produto individual incluído ainda.
                        </p>
                      )}
                    </div>

                    {/* Price with Autocalculate helper */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                          Preço Comercial do Pacote (R$)
                        </label>

                        {formItens.length > 0 && (
                          <button
                            type="button"
                            onClick={handleCalculateEstimatedComboPrice}
                            className="text-[9.5px] font-black text-[#7CFF01] hover:underline flex items-center gap-1 bg-[#7CFF01]/10 px-2 py-0.5 rounded-md border border-[#7CFF01]/25"
                          >
                            <Sparkles className="h-3 w-3 inline" />
                            Calcular soma dos itens
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={formPreco}
                          onChange={(e) => setFormPreco(e.target.value)}
                          placeholder="3950.00"
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 pl-9 text-xs font-black text-gray-950 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-zinc-500">
                        O montante cadastrado será utilizado para auto-compor os orçamentos e documentos contratuais rápidos.
                      </p>
                    </div>

                    {/* Active toggle */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/30 border border-gray-100 dark:border-zinc-850 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-gray-900 dark:text-white">Pacote Ativo para Eventos</p>
                        <p className="text-[9.5px] text-gray-400 dark:text-zinc-500">
                          Se inativo, esse pacote será guardado como rascunho de orçamento técnico.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormAtivo(!formAtivo)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                          formAtivo ? 'bg-[#7CFF01]' : 'bg-gray-200 dark:bg-zinc-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            formAtivo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Submit footer triggers */}
                    <div className="flex gap-2.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsPanelOpen(false)}
                        className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold dark:border-zinc-800 dark:text-zinc-400"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving || isUploading}
                        className="active-click flex-1 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#7CFF01] text-xs font-black text-gray-950 hover:bg-[#6edc01] disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>Gravar Combo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
