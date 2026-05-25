import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Trash2, 
  Plus, 
  Search, 
  Edit2, 
  Sliders, 
  DollarSign, 
  Layers, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Power, 
  FileText, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Star,
  Info
} from 'lucide-react';
import { Equipment, EquipmentComponent } from '../types';
import { INITIAL_EQUIPMENT, loadData, saveData } from '../data';
import { getFirebaseDb, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

interface KitComponentRow {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function EquipmentScreen() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  // Form Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Form Field States
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState<'Paineis e Pistas' | 'Estruturas' | 'Sonorização' | 'Iluminação'>('Sonorização');
  const [formDescricao, setFormDescricao] = useState('');
  const [formFotos, setFormFotos] = useState<string[]>([]);
  const [formFotoCapaUrl, setFormFotoCapaUrl] = useState('');
  const [formPreco, setFormPreco] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kit System States
  const [formIsKit, setFormIsKit] = useState(false);
  const [kitComponents, setKitComponents] = useState<KitComponentRow[]>([]);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedCompQty, setSelectedCompQty] = useState(1);
  const [compSearchText, setCompSearchText] = useState('');

  // Display toast function
  const triggerToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Real-time listen to Firestore with localstorage recovery fallback
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      setIsLoading(true);
      const unsubscribe = onSnapshot(collection(db, 'equipamentos'), (snapshot) => {
        const items: Equipment[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Equipment);
        });
        setEquipmentList(items);
        saveData('als_equipment_list', items);
        setIsLoading(false);
      }, (error) => {
        console.error("Firestore read error:", error);
        // Recover local storage copy silently
        const loadedFallback = loadData<Equipment>('als_equipment_list', INITIAL_EQUIPMENT);
        setEquipmentList(loadedFallback);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Local Sandbox execution
      const loaded = loadData<Equipment>('als_equipment_list', INITIAL_EQUIPMENT);
      setEquipmentList(loaded);
      setIsLoading(false);
    }
  }, []);

  // Quick alternative status switch
  const handleToggleStatus = async (item: Equipment) => {
    const updated = { ...item, ativo: !item.ativo, atualizado_em: new Date().toISOString() };
    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'equipamentos', item.id), updated);
        triggerToast('success', `Equipamento ${updated.nome} agora está ${updated.ativo ? 'Ativo' : 'Inativo'}!`);
      } catch (err: any) {
        console.error("Firestore toggle status error:", err);
        triggerToast('error', 'Ops! Erro ao atualizar status.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `equipamentos/${item.id}`);
        } catch {}
      }
    } else {
      const newList = equipmentList.map(eq => eq.id === item.id ? updated : eq);
      setEquipmentList(newList);
      saveData('als_equipment_list', newList);
      triggerToast('success', `Status de ${updated.nome} alternado localmente!`);
    }
  };

  // Safe item removal handler
  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Deseja realmente inativar/deletar este equipamento permanentemente?")) {
      const db = getFirebaseDb();
      if (db) {
        try {
          await deleteDoc(doc(db, 'equipamentos', id));
          triggerToast('success', 'Equipamento excluído com sucesso.');
        } catch (err: any) {
          console.error("Firestore delete error:", err);
          triggerToast('error', 'Sem permissão para excluir equipamento.');
          try {
            handleFirestoreError(err, OperationType.DELETE, `equipamentos/${id}`);
          } catch {}
        }
      } else {
        const newList = equipmentList.filter(eq => eq.id !== id);
        setEquipmentList(newList);
        saveData('als_equipment_list', newList);
        triggerToast('success', 'Equipamento removido do acervo local!');
      }
    }
  };
  const handleImagesUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'equipamentos');
        const response = await fetch('https://api.cloudinary.com/v1_1/dnatvwcxy/image/upload', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error('Falha no upload para o Cloudinary.');
        const data = await response.json();
        return data.secure_url;
      });
      
      const urls = await Promise.all(uploadPromises);
      const updatedFotos = [...formFotos, ...urls];
      setFormFotos(updatedFotos);
      if (!formFotoCapaUrl && updatedFotos.length > 0) {
        setFormFotoCapaUrl(updatedFotos[0]);
      }
      triggerToast('success', 'Imagens enviadas!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Falha no upload das imagens.');
      triggerToast('error', 'Falha no upload das imagens.');
    } finally {
      setIsUploading(false);
    }
  };

  // Utility for Cloudinary image transformation
  const getCloudinaryUrl = (url: string, width: number) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/w_${width},c_limit/`);
  };

  // Open Panel for creating
  const openNewForm = () => {
    setEditingId(null);
    setFormNome('');
    setFormCategoria('Sonorização');
    setFormDescricao('');
    setFormFotos([]);
    setFormFotoCapaUrl('');
    setFormPreco('');
    setFormAtivo(true);
    setFormIsKit(false);
    setKitComponents([]);
    setSelectedCompId('');
    setSelectedCompQty(1);
    setCompSearchText('');
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Open Panel for editing state
  const openEditForm = (item: Equipment) => {
    setEditingId(item.id);
    setFormNome(item.nome);
    setFormCategoria(item.categoria);
    setFormDescricao(item.descricao || '');
    
    // Retrocompatibility for images
    const fotos = (item.fotos && item.fotos.length > 0) ? item.fotos : [item.foto_url];
    setFormFotos(fotos);
    setFormFotoCapaUrl(item.foto_capa_url || item.foto_url || '');
    
    setFormPreco(item.preco.toString());
    setFormAtivo(item.ativo);
    setFormIsKit(item.is_kit);
    setErrorMsg('');

    // Reconstruct detailed kit components matching ids in list
    if (item.is_kit && item.componentes) {
      const listMapped: KitComponentRow[] = item.componentes.map(comp => {
        const found = equipmentList.find(eq => eq.id === comp.equipamento_id);
        return {
          id: comp.equipamento_id,
          nome: found ? found.nome : 'Item não cadastrado',
          preco: found ? found.preco : 0,
          quantidade: comp.quantidade
        };
      });
      setKitComponents(listMapped);
    } else {
      setKitComponents([]);
    }
    
    setSelectedCompId('');
    setSelectedCompQty(1);
    setCompSearchText('');
    setIsPanelOpen(true);
  };

  // Component inside Combo list management
  const handleAddComponentToKit = () => {
    if (!selectedCompId) {
      triggerToast('warning', 'Escolha um equipamento individual primeiro.');
      return;
    }

    const found = equipmentList.find(eq => eq.id === selectedCompId);
    if (!found) return;

    // Check duplication of same reference in kit array
    if (kitComponents.some(kc => kc.id === selectedCompId)) {
      triggerToast('warning', 'Este componente já está contido neste kit combo.');
      return;
    }

    const newItem: KitComponentRow = {
      id: found.id,
      nome: found.nome,
      preco: found.preco,
      quantidade: Number(selectedCompQty)
    };

    setKitComponents(prev => [...prev, newItem]);
    
    // Auto calculate suggested price if form is empty or set
    const totalNewCost = [...kitComponents, newItem].reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    // Suggest price in UI
    if (!formPreco) {
      setFormPreco(totalNewCost.toString());
    }

    // Reset selectors
    setSelectedCompId('');
    setSelectedCompQty(1);
    setCompSearchText('');
  };

  const handleRemoveComponentFromKit = (id: string) => {
    setKitComponents(prev => prev.filter(item => item.id !== id));
  };

  // Calc total price of kit items
  const suggestedKitPrice = kitComponents.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  // Form submit saving action
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formNome.trim()) {
      setErrorMsg('O Nome do Equipamento é um campo obrigatório.');
      triggerToast('error', 'Nome do equipamento ausente.');
      return;
    }

    if (!formPreco || isNaN(Number(formPreco)) || Number(formPreco) < 0) {
      setErrorMsg('O preço da locação deve conter um valor numérico válido.');
      triggerToast('error', 'Valor de preço inválido.');
      return;
    }

    if (formIsKit && kitComponents.length === 0) {
      setErrorMsg('Um Kit / Combo de Equipamento requer no mínimo 1 item componente.');
      triggerToast('error', 'Kit combo sem componentes cadastrados.');
      return;
    }

    setIsSaving(true);
    const resolvedId = editingId || 'eq_' + Date.now();
    const finalFoto = formFotoCapaUrl.trim() || (formFotos.length > 0 ? formFotos[0] : 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg');

    const mappedComponents: EquipmentComponent[] = formIsKit 
      ? kitComponents.map(c => ({ equipamento_id: c.id, quantidade: c.quantidade })) 
      : [];

    const equipmentPayload: Equipment = {
      id: resolvedId,
      categoria: formCategoria,
      nome: formNome.trim(),
      descricao: formDescricao.trim(),
      foto_url: formFotoCapaUrl || (formFotos.length > 0 ? formFotos[0] : ''),
      fotos: formFotos,
      foto_capa_url: formFotoCapaUrl || (formFotos.length > 0 ? formFotos[0] : ''),
      preco: Number(formPreco),
      ativo: formAtivo,
      is_kit: formIsKit,
      componentes: mappedComponents,
      atualizado_em: new Date().toISOString()
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'equipamentos', resolvedId), equipmentPayload);
        triggerToast('success', `Equipamento "${formNome}" salvo com sucesso!`);
        setIsPanelOpen(false);
      } catch (err: any) {
        console.error("Firestore save exception:", err);
        setErrorMsg('Erro de permissão ou conexão ao salvar seu equipamento no Firestore.');
        triggerToast('error', 'Erro ao salvar.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `equipamentos/${resolvedId}`);
        } catch {}
      } finally {
        setIsSaving(false);
      }
    } else {
      // Sandbox implementation
      let updatedList: Equipment[];
      if (editingId) {
        updatedList = equipmentList.map(eq => eq.id === editingId ? equipmentPayload : eq);
      } else {
        updatedList = [...equipmentList, equipmentPayload];
      }
      setEquipmentList(updatedList);
      saveData('als_equipment_list', updatedList);
      triggerToast('success', `Equipamento "${formNome}" atualizado na sandbox local!`);
      setIsPanelOpen(false);
      setIsSaving(false);
    }
  };

  // Options of items available to add to kit (must not be a kit itself and must be active)
  const availableInventory = equipmentList.filter(eq => !eq.is_kit && eq.ativo);

  // Search in inventory dropdown list
  const filteredAvailableInventory = availableInventory.filter(eq => 
    eq.nome.toLowerCase().includes(compSearchText.toLowerCase())
  );

  // Stats calculators
  const countTotal = equipmentList.length;
  const countActive = equipmentList.filter(e => e.ativo).length;
  const countKits = equipmentList.filter(e => e.is_kit).length;

  const countPaineis = equipmentList.filter(e => e.categoria === 'Paineis e Pistas').length;
  const countEstruturas = equipmentList.filter(e => e.categoria === 'Estruturas').length;
  const countSom = equipmentList.filter(e => e.categoria === 'Sonorização').length;
  const countIlum = equipmentList.filter(e => e.categoria === 'Iluminação').length;

  // Filtered equipments array
  const filteredList = equipmentList.filter(eq => {
    const matchesSearch = eq.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (eq.descricao && eq.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'Todos' || eq.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Category Colors
  const getCatColorClass = (cat: 'Paineis e Pistas' | 'Estruturas' | 'Sonorização' | 'Iluminação') => {
    switch (cat) {
      case 'Paineis e Pistas': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Estruturas': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Sonorização': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Iluminação': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Toast Overlay element */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold leading-none ${
              toast.type === 'success' 
                ? 'bg-[#7CFF01]/10 text-[#7CFF01] border-[#7CFF01]/30 backdrop-blur-md'
                : toast.type === 'error'
                  ? 'bg-orange-500/10 text-orange-500 border-orange-500/30 backdrop-blur-md'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' && <Check className="h-4 w-4 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toast.type === 'warning' && <Info className="h-4 w-4 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header section with modern bento stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#7CFF01] bg-[#7CFF01]/10 px-2.5 py-1 rounded-full border border-[#7CFF01]/20">
            ARM Som e Luz Logistics
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white mt-2 tracking-tight">
            Gerenciamento de Equipamentos
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Consulte o estoque de locações ativas da empresa, altere preços e monte kits de equipamentos.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="active-click flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7CFF01] text-xs font-black text-gray-950 transition-all hover:bg-[#6edc01] px-5 shadow-lg shadow-[#7CFF01]/10"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Cadastrar Equipamento</span>
        </button>
      </div>

      {/* Bento Counters Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-zinc-900/60 dark:bg-zinc-900/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Total no Acervo</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white leading-none">{countTotal}</span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-550 font-bold font-mono">itens listados</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-zinc-900/60 dark:bg-zinc-900/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Estoque Ativo</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-[#7CFF01] leading-none">{countActive}</span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-550 font-bold font-mono">prontos p/ locação</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-zinc-900/60 dark:bg-zinc-900/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Kits & Combos</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-sky-400 leading-none">{countKits}</span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-550 font-bold font-mono">agrupamentos</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-zinc-900/60 dark:bg-zinc-900/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Categorias Ativas</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-2.5 font-semibold text-[9.5px] text-gray-500 dark:text-zinc-400">
            <span>Pistas: <span className="font-bold text-gray-800 dark:text-white">{countPaineis}</span></span>
            <span>Estruturas: <span className="font-bold text-gray-800 dark:text-white">{countEstruturas}</span></span>
            <span>Som: <span className="font-bold text-gray-800 dark:text-white">{countSom}</span></span>
            <span>Luz: <span className="font-bold text-gray-800 dark:text-white">{countIlum}</span></span>
          </div>
        </div>
      </div>

      {/* Sorter Engine & Filter Tabs */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-gray-100 dark:border-zinc-900/70">
        
        {/* Navigation Categories Tabs */}
        <div className="flex overflow-x-auto pb-1 xl:pb-0 gap-1.5 scrollbar-none select-none">
          {['Todos', 'Paineis e Pistas', 'Estruturas', 'Sonorização', 'Iluminação'].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
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

        {/* Real-time search element */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar equipamento por nome ou descrição técnica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-xs text-gray-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#7CFF01] dark:focus:border-[#7CFF01] font-semibold"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Catalog View Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-gray-150 rounded-3xl dark:border-zinc-800/80 bg-zinc-50/20">
          <RefreshCw className="h-7 w-7 text-[#7CFF01] animate-spin" />
          <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Carregando acervo técnico...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-150 rounded-3xl bg-zinc-50/10 dark:border-zinc-850 dark:bg-zinc-950/20">
          <Package className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto stroke-1" />
          <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 mt-2">Nenhum equipamento correspondente</p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Tente limpar os filtros de busca para encontrar itens disponíveis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredList.map((item) => (
            <motion.div
              layout
              key={item.id}
              className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-300 dark:bg-zinc-900/70 border-gray-150 dark:border-zinc-800/80 hover:border-gray-200 dark:hover:border-zinc-700 ${
                !item.ativo ? 'opacity-70 saturate-50' : ''
              }`}
            >
              {/* Card visual banner & details */}
              <div>
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950/90 flex items-center justify-center cursor-pointer" onClick={() => { setSelectedEquipment(item); setCurrentImageIndex(0); }}>
                  <img
                    referrerPolicy="no-referrer"
                    src={getCloudinaryUrl(item.foto_capa_url || (item.fotos && item.fotos.length > 0 ? item.fotos[0] : item.foto_url), 500)}
                    alt={item.nome}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-102"
                  />
                  {/* Categorias absolute tags */}
                  <span className={`absolute top-2.5 left-2.5 rounded-full border px-2.5 py-1 text-[8.5px] font-extrabold tracking-wide uppercase leading-none backdrop-blur-md shadow-xs ${getCatColorClass(item.categoria)}`}>
                    {item.categoria}
                  </span>

                  {/* Badges corner layout */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
                    {/* Active Inactive indicator */}
                    <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase leading-none border shadow-xs tracking-wider flex items-center gap-1 ${
                      item.ativo 
                        ? 'bg-zinc-950 border-[#7CFF01]/10 text-[#7CFF01]' 
                        : 'bg-zinc-950 border-orange-500/10 text-orange-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${item.ativo ? 'bg-[#7CFF01] animate-pulse' : 'bg-orange-500'}`} />
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>

                    {/* Is Kit indicator */}
                    {item.is_kit && (
                      <span className="rounded-full bg-zinc-950 border border-sky-400/20 text-sky-400 px-2 py-0.5 text-[8.5px] font-black uppercase leading-none flex items-center gap-1 shadow-xs tracking-wider">
                        <Layers className="h-2.5 w-2.5" />
                        Combo Kit
                      </span>
                    )}
                  </div>
                </div>

                {/* Info and descriptives */}
                <div className="p-4.5 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-black text-gray-950 dark:text-white truncate" title={item.nome}>
                      {item.nome}
                    </h3>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal line-clamp-2 min-h-[33px]">
                    {item.descricao || 'Nenhuma descrição detalhada inserida.'}
                  </p>

                  {/* Components mini preview if is kit */}
                  {item.is_kit && item.componentes && item.componentes.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-gray-50/50 border border-gray-100/60 dark:bg-zinc-950/40 dark:border-zinc-800/50 space-y-1">
                      <p className="text-[8px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                        <Layers className="h-2 w-2" />
                        Itens integrados ({item.componentes.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.componentes.slice(0, 3).map((comp, idx) => {
                          const target = equipmentList.find(eq => eq.id === comp.equipamento_id);
                          return (
                            <span key={idx} className="inline-flex text-[9px] bg-white border border-gray-150 dark:bg-zinc-900 dark:border-zinc-850 px-1.5 py-0.5 rounded-md font-semibold text-gray-650 dark:text-zinc-350">
                              {target ? target.nome : 'Item'} × {comp.quantidade}
                            </span>
                          );
                        })}
                        {item.componentes.length > 3 && (
                          <span className="inline-flex text-[9px] text-[#7CFF01] font-extrabold px-1">+{item.componentes.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom strip pricing & operational commands */}
              <div className="bg-zinc-50/50 group-hover:bg-zinc-50/90 dark:bg-zinc-950/40 border-t border-gray-100 px-4.5 py-3 dark:border-zinc-850/60 transition-colors flex items-center justify-between mt-auto">
                <div className="space-y-0.5 font-mono">
                  <p className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-sans font-bold">Diária Locação</p>
                  <span className="text-sm font-black text-gray-950 dark:text-white text-right leading-none">
                    {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {/* Operations tools triggers */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      item.ativo 
                        ? 'border-gray-200 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-orange-500/10'
                        : 'border-[#7CFF01]/30 bg-[#7CFF01]/10 text-[#7CFF01] hover:bg-[#7CFF01]/20'
                    }`}
                    title={item.ativo ? 'Inativar item' : 'Ativar item'}
                  >
                    <Power className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => openEditForm(item)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-550 hover:bg-gray-100 hover:text-gray-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                    title="Editar propriedades"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg border border-red-100/60 text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remover permanente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEquipment(null)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl p-6 overflow-hidden">
              
              {/* Carousel */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                <img src={getCloudinaryUrl(selectedEquipment.fotos[currentImageIndex] || selectedEquipment.foto_capa_url, 800)} className="w-full h-full object-contain" />
                
                {selectedEquipment.fotos.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex((c) => (c - 1 + selectedEquipment.fotos.length) % selectedEquipment.fotos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 backdrop-blur"><ChevronLeft /></button>
                    <button onClick={() => setCurrentImageIndex((c) => (c + 1) % selectedEquipment.fotos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 backdrop-blur"><ChevronRight /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {selectedEquipment.fotos.map((_, i) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentImageIndex ? 'bg-[#7CFF01]' : 'bg-zinc-300'}`} />)}
                    </div>
                  </>
                )}
              </div>
              
              <h3 className="text-xl font-black mt-4">{selectedEquipment.nome}</h3>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {selectedEquipment.categoria}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{selectedEquipment.descricao}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide-over Right Side Form Panel for Creation & Edition */}
      <AnimatePresence>
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs transition-opacity"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="pointer-events-auto w-screen max-w-2xl"
              >
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl dark:bg-zinc-900">
                  {/* Panel view header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white dark:bg-zinc-900 px-6 py-5 dark:border-zinc-800">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-[#7CFF01] tracking-widest">Procedimento Técnico</span>
                      <h2 className="text-md sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                        {editingId ? 'Editar Equipamento' : 'Cadastrar Equipamento'}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsPanelOpen(false)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Operational validation warning container */}
                  {errorMsg && (
                    <div className="m-6 mb-0 flex items-start gap-2.5 bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                      <p>{errorMsg}</p>
                    </div>
                  )}

                  {/* Form fields core body */}
                  <form onSubmit={handleSaveEquipment} className="flex-1 p-6 space-y-5">
                    
                    {/* Visual Photo Upload Field */}
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 block">
                         Fotos do Equipamento
                       </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {formFotos.map((url, idx) => (
                           <div key={url} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-transparent">
                             <img src={getCloudinaryUrl(url, 160)} alt={`Equipamento ${idx}`} className="w-full h-full object-cover" />
                             {/* Cover badge */}
                             {formFotoCapaUrl === url && (
                               <div className="absolute top-1 left-1 bg-[#7CFF01] text-gray-950 text-[8px] font-black px-1.5 rounded-md">Capa</div>
                             )}
                             {/* Controls */}
                             <div className="absolute inset-0 bg-zinc-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                               <button type="button" onClick={() => setFormFotoCapaUrl(url)} className="p-1 rounded-full bg-white text-gray-900 hover:text-[#7CFF01]"><Star className="h-3 w-3" /></button>
                               <button type="button" onClick={() => {
                                 const next = formFotos.filter(f => f !== url);
                                 setFormFotos(next);
                                 if (formFotoCapaUrl === url) setFormFotoCapaUrl(next[0] || '');
                               }} className="p-1 rounded-full bg-red-500 text-white"><X className="h-3 w-3" /></button>
                             </div>
                           </div>
                        ))}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#7CFF01] hover:text-[#7CFF01]"><Plus className="h-6 w-6" /></button>
                      </div>
                      
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImagesUpload(e.target.files)} />
                    </div>

                    {/* Standard text inputs info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name fields */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                          Nome do Equipamento / Combo
                        </label>
                        <input
                          type="text"
                          required
                          value={formNome}
                          onChange={(e) => setFormNome(e.target.value)}
                          placeholder="Ex: Pista de LED de Vidro Temperado 4x4"
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                        />
                      </div>

                      {/* Select category dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                          Categoria Técnica
                        </label>
                        <select
                          value={formCategoria}
                          onChange={(e) => setFormCategoria(e.target.value as any)}
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                        >
                          <option value="Paineis e Pistas">Paineis e Pistas</option>
                          <option value="Estruturas">Estruturas</option>
                          <option value="Sonorização">Sonorização</option>
                          <option value="Iluminação">Iluminação</option>
                        </select>
                      </div>
                    </div>

                    {/* Description briefs */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Descrição / Especificações Técnicas
                      </label>
                      <textarea
                        rows={3}
                        value={formDescricao}
                        onChange={(e) => setFormDescricao(e.target.value)}
                        placeholder="Descreva as conexões, polegadas, potência, garras e detalhes construtivos..."
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      />
                    </div>

                    {/* Checkbox selector for KIT / Combo system */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/30 border border-gray-150-100 dark:border-zinc-850 flex items-center justify-between gap-3">
                      <div className="space-y-1 pr-2">
                        <p className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-sky-400" />
                          Kit / Combo de Variações?
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-normal">
                          Marque para agrupar múltiplos equipamentos individuais cadastrados, criando um combo comercial.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFormIsKit(!formIsKit);
                          // Reset elements if toggled off
                          if (!formIsKit === false) {
                            setKitComponents([]);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                          formIsKit ? 'bg-[#7CFF01]' : 'bg-gray-200 dark:bg-zinc-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            formIsKit ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Dynamic block for components list if is_kit is checked */}
                    {formIsKit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4.5 rounded-2xl bg-[#7CFF01]/5 border border-[#7CFF01]/10 space-y-4"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-150 dark:border-zinc-800">
                          <span className="text-[10px] font-black uppercase text-[#7CFF01] tracking-widest flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Componentes do Combo / Kit
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            Auto-Soma Sugerida: R$ {suggestedKitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Interactive items selectors with input text search */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          {/* Search / dropdown search container */}
                          <div className="sm:col-span-7 space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-400">Selecionar Equipamento Individual</label>
                            
                            {/* Simple text query box for dropdown filtering */}
                            <div className="relative">
                              <select
                                value={selectedCompId}
                                onChange={(e) => setSelectedCompId(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                              >
                                <option value="">-- Escolha um Equipamento --</option>
                                {availableInventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.nome} (R$ {inv.preco.toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Quantity selectors */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-400">Quant.</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedCompQty}
                              onChange={(e) => setSelectedCompQty(Math.max(1, Number(e.target.value)))}
                              className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-900 outline-none text-center font-bold dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            />
                          </div>

                          {/* Trigger action button */}
                          <div className="sm:col-span-3 flex items-end">
                            <button
                              type="button"
                              onClick={handleAddComponentToKit}
                              className="active-click w-full h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-[10px] font-black uppercase dark:bg-zinc-100 dark:text-gray-950 dark:hover:bg-zinc-200 flex items-center justify-center gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>

                        {/* Added Components list table */}
                        {kitComponents.length === 0 ? (
                          <div className="text-center py-5 border border-dashed border-gray-200 dark:border-zinc-800/80 rounded-xl">
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold">Nenhum item adicionado no combo.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                            {kitComponents.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 dark:bg-zinc-950 dark:border-zinc-850"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-gray-800 dark:text-zinc-200 max-w-sm truncate">{item.nome}</p>
                                  <div className="flex gap-2 text-[9px] text-gray-400 font-mono font-semibold">
                                    <span>Unitário: R$ {item.preco.toFixed(2)}</span>
                                    <span>× {item.quantidade}</span>
                                    <span className="text-[#7CFF01] font-bold">Subtotal: R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveComponentFromKit(item.id)}
                                  className="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Preço de Rental locação block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                            Preço Final da Locação (Diário)
                          </label>
                          {formIsKit && (
                            <span className="text-[8.5px] font-black text-[#7CFF01] bg-[#7CFF01]/10 px-2 rounded-md">
                              Sugestão: R$ {suggestedKitPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formPreco === '0' ? '' : formPreco}
                            onChange={(e) => setFormPreco(e.target.value)}
                            placeholder="0,00"
                            className="w-full rounded-xl border border-gray-200 bg-white p-2.5 pl-9 text-xs font-bold text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                          />
                        </div>
                        <p className="text-[9px] text-gray-400 dark:text-zinc-500 leading-normal">
                          {formIsKit 
                            ? "Você é livre para definir o preço final do kit manualmente, permitindo dar descontos comerciais."
                            : "Preço diário base praticado na região de Botucatu e circunvizinhança."
                          }
                        </p>
                      </div>

                      {/* Status Check Switch */}
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                          Disponibilidade Inicial
                        </label>
                        <div className="h-10 px-3 flex items-center justify-between rounded-xl bg-gray-50 dark:bg-zinc-950/30 border border-gray-150-100 dark:border-zinc-800">
                          <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">Equipamento Ativo?</span>
                          <button
                            type="button"
                            onClick={() => setFormAtivo(!formAtivo)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                              formAtivo ? 'bg-[#7CFF01]' : 'bg-gray-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                formAtivo ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions Form Submit Strip */}
                    <div className="flex gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsPanelOpen(false)}
                        className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 dark:bg-zinc-950/20 dark:border-zinc-800 dark:text-zinc-400 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-[2] h-11 rounded-xl bg-[#7CFF01] text-xs font-black text-gray-950 hover:bg-[#6edc01] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#7CFF01]/10"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Gravando no Firebase...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>Confirmar Propriedades</span>
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
