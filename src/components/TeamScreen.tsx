import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Power, 
  Link, 
  User, 
  DollarSign, 
  Mail, 
  Sparkles,
  ChevronRight,
  Info 
} from 'lucide-react';
import { TeamMember } from '../types';
import { INITIAL_TEAM, loadData, saveData } from '../data';
import { getFirebaseDb, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function TeamScreen() {
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [usuariosList, setUsuariosList] = useState<{ id: string; nome: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search query & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Todos');

  // Form Panel controls
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formNome, setFormNome] = useState('');
  const [formFuncao, setFormFuncao] = useState('');
  const [formDiaria, setFormDiaria] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formUsuarioId, setFormUsuarioId] = useState<string>('');

  // Toast notifications
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to display localized feedback
  const triggerToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // 1. Fetch 'usuarios' for Account Linking
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      const unsubscribe = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
        const uList: { id: string; nome: string }[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          uList.push({ id: doc.id, nome: d.nome || 'Sem Nome' });
        });
        setUsuariosList(uList);
      }, (err) => {
        console.warn("Firestore error listing users (usuarios) - using fallback:", err);
        setUsuariosList([
          { id: 'usr_demo1', nome: 'Dener Arthur de Melo (Diretor)' },
          { id: 'usr_demo2', nome: 'Bruno Caixas (Som PA)' },
          { id: 'usr_demo3', nome: 'Arthur Som/Luz (Master)' }
        ]);
      });
      return () => unsubscribe();
    } else {
      setUsuariosList([
        { id: 'usr_demo1', nome: 'Dener Arthur de Melo (Diretor)' },
        { id: 'usr_demo2', nome: 'Bruno Caixas (Som PA)' },
        { id: 'usr_demo3', nome: 'Arthur Som/Luz (Master)' }
      ]);
    }
  }, []);

  // 2. Real-time Subscription to Technical Staff ('funcionarios')
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      setIsLoading(true);
      const unsubscribe = onSnapshot(collection(db, 'funcionarios'), (snapshot) => {
        const list: TeamMember[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            nome: data.nome || '',
            funcao: data.funcao || '',
            diaria: Number(data.diaria || 0),
            foto_url: data.foto_url || '',
            ativo: data.ativo !== false,
            usuario_id: data.usuario_id || null,
            atualizado_em: data.atualizado_em || null,
            // Backwards compatibility legacy properties:
            name: data.nome || '',
            role: data.funcao || '',
            dailyRate: Number(data.diaria || 0)
          });
        });
        setTeamList(list);
        saveData('team_funcionarios', list);
        setIsLoading(false);
      }, (error) => {
        console.error("Firestore read error on funcionarios - using local recovery:", error);
        const fallback = loadData<TeamMember>('team_funcionarios', INITIAL_TEAM);
        setTeamList(fallback);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      const loadedFallback = loadData<TeamMember>('team_funcionarios', INITIAL_TEAM);
      setTeamList(loadedFallback);
      setIsLoading(false);
    }
  }, []);

  // Soft switch member active status
  const handleToggleStatus = async (item: TeamMember) => {
    const updated = { 
      ...item, 
      ativo: !item.ativo, 
      atualizado_em: new Date().toISOString() 
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'funcionarios', item.id), {
          nome: updated.nome,
          funcao: updated.funcao,
          diaria: updated.diaria,
          foto_url: updated.foto_url,
          ativo: updated.ativo,
          usuario_id: updated.usuario_id,
          atualizado_em: updated.atualizado_em
        });
        triggerToast('success', `${updated.nome} está agora ${updated.ativo ? 'Convocável' : 'Inativo'}.`);
      } catch (err: any) {
        console.error("Firestore toggle status team member error:", err);
        triggerToast('error', 'Sem permissão para alternar status do colaborador.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `funcionarios/${item.id}`);
        } catch {}
      }
    } else {
      const newList = teamList.map(m => m.id === item.id ? updated : m);
      setTeamList(newList);
      saveData('team_funcionarios', newList);
      triggerToast('success', `Status de ${updated.nome} alternado localmente.`);
    }
  };

  // Safe crew member wipe
  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o funcionário "${name}" do acervo técnico permanentemente?`)) {
      const db = getFirebaseDb();
      if (db) {
        try {
          await deleteDoc(doc(db, 'funcionarios', id));
          triggerToast('success', `Colaborador ${name} deletado com sucesso do Firebase.`);
        } catch (err: any) {
          console.error("Firestore delete error in crew model:", err);
          triggerToast('error', 'Sem autorização administrativa para excluir este funcionário.');
          try {
            handleFirestoreError(err, OperationType.DELETE, `funcionarios/${id}`);
          } catch {}
        }
      } else {
        const newList = teamList.filter(m => m.id !== id);
        setTeamList(newList);
        saveData('team_funcionarios', newList);
        triggerToast('success', `Colaborador ${name} excluído localmente.`);
      }
    }
  };

  // Cloudinary Service for Team uploads with custom 'equipe' folders
  const handlePhotoUpload = async (file: File) => {
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

      if (!response.ok) {
        throw new Error('Retorno inválido ao carregar foto nos servidores Cloudinary.');
      }

      const media = await response.json();
      if (media.secure_url) {
        setFormFotoUrl(media.secure_url);
        triggerToast('success', 'Foto de perfil carregada e otimizada!');
      } else {
        throw new Error('Falha ao decodificar secure_url.');
      }
    } catch (err: any) {
      console.error("Cloudinary upload failure:", err);
      setErrorMsg(err.message || 'Falha ao processar upload da foto de perfil.');
      triggerToast('error', 'Falha no upload da foto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Open Form for insert crew member
  const openNewForm = () => {
    setEditingId(null);
    setFormNome('');
    setFormFuncao('');
    setFormDiaria('');
    setFormFotoUrl('');
    setFormAtivo(true);
    setFormUsuarioId('');
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Open Form for update crew member
  const openEditForm = (item: TeamMember) => {
    setEditingId(item.id);
    setFormNome(item.nome);
    setFormFuncao(item.funcao);
    setFormDiaria(item.diaria.toString());
    setFormFotoUrl(item.foto_url);
    setFormAtivo(item.ativo);
    setFormUsuarioId(item.usuario_id || '');
    setErrorMsg('');
    setIsPanelOpen(true);
  };

  // Form submit operations
  const handleSaveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formNome.trim()) {
      setErrorMsg('O Nome do Funcionário é um parâmetro obrigatório.');
      triggerToast('error', 'Nome do funcionário requerido.');
      return;
    }

    if (!formFuncao.trim()) {
      setErrorMsg('Indique a Função/Cargo técnico do colaborador.');
      triggerToast('error', 'Função técnica requerida.');
      return;
    }

    if (!formDiaria || isNaN(Number(formDiaria)) || Number(formDiaria) < 0) {
      setErrorMsg('Forneça um valor de Diária comercial válido em R$.');
      triggerToast('error', 'Diária monetária incorreta.');
      return;
    }

    setIsSaving(true);
    const resolvedId = editingId || 'member_' + Date.now();
    const finalFoto = formFotoUrl.trim() || 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png';

    const payload: TeamMember = {
      id: resolvedId,
      nome: formNome.trim(),
      funcao: formFuncao.trim(),
      diaria: Number(formDiaria),
      foto_url: finalFoto,
      ativo: formAtivo,
      usuario_id: formUsuarioId || null,
      atualizado_em: new Date().toISOString(),
      // Backward compatibility variables:
      name: formNome.trim(),
      role: formFuncao.trim(),
      dailyRate: Number(formDiaria)
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'funcionarios', resolvedId), {
          nome: payload.nome,
          funcao: payload.funcao,
          diaria: payload.diaria,
          foto_url: payload.foto_url,
          ativo: payload.ativo,
          usuario_id: payload.usuario_id,
          atualizado_em: payload.atualizado_em
        });
        triggerToast('success', `Colaborador "${formNome}" salvo com sucesso no Firebase!`);
        setIsPanelOpen(false);
      } catch (err: any) {
        console.error("Firestore save member exception:", err);
        setErrorMsg('Erro de permissão ou rede ao salvar o profissional no banco de dados.');
        triggerToast('error', 'Falha ao salvar no Firestore.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `funcionarios/${resolvedId}`);
        } catch {}
      } finally {
        setIsSaving(false);
      }
    } else {
      // Local Storage sandbox
      let updatedList: TeamMember[];
      if (editingId) {
        updatedList = teamList.map(m => m.id === editingId ? payload : m);
      } else {
        updatedList = [...teamList, payload];
      }
      setTeamList(updatedList);
      saveData('team_funcionarios', updatedList);
      triggerToast('success', `Colaborador "${formNome}" atualizado na sandbox local.`);
      setIsPanelOpen(false);
      setIsSaving(false);
    }
  };

  // Filtering system logic
  const filteredCrew = teamList.filter(member => {
    const matchesSearch = member.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.funcao.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'Ativos') return matchesSearch && member.ativo;
    if (activeFilter === 'Inativos') return matchesSearch && !member.ativo;
    return matchesSearch;
  });

  // Simple statistics
  const statTotal = teamList.length;
  const statActive = teamList.filter(m => m.ativo).length;
  const statLinked = teamList.filter(m => m.usuario_id).length;
  const statTotalDaily = teamList.filter(m => m.ativo).reduce((sum, curr) => sum + curr.diaria, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Dynamic Toast Element */}
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

      {/* Hero Header Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#7CFF01] bg-[#7CFF01]/10 px-2.5 py-1 rounded-full border border-[#7CFF01]/20">
            Escalação da Equipe & Diárias
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white mt-1.5 tracking-tight">
            Gerenciamento de Equipe e Funcionários
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Organize a equipe técnica da ARM Som e Luz, configure valores de diárias técnicas e vincule logins de acesso.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="active-click flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7CFF01] text-xs font-black text-gray-950 transition-all hover:bg-[#6edc01] px-5 shadow-lg shadow-[#7CFF01]/10"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Cadastrar Funcionário</span>
        </button>
      </div>

      {/* Bento Stats Indicators Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-[#1E1E20]/60 dark:bg-[#1E1E20]/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Total Cadastrado</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white leading-none">{statTotal}</span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold font-mono">profissionais</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-[#1E1E20]/60 dark:bg-[#1E1E20]/40">
          <p className="text-[10px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Profissionais Ativos</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-[#7CFF01] leading-none">{statActive}</span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold font-mono">em convocação</span>
          </div>
        </div>
      </div>

      {/* Sorter & Filter Control Panel */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-gray-100 dark:border-zinc-900/70">
        
        {/* Navigation Categories Tabs */}
        <div className="flex overflow-x-auto pb-1 xl:pb-0 gap-1.5 scrollbar-none select-none">
          {(['Todos', 'Ativos', 'Inativos'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`py-1.5 px-4 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all tracking-tight ${
                  isActive 
                    ? 'bg-zinc-900 text-[#7CFF01] dark:bg-zinc-100 dark:text-gray-950' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'
                }`}
              >
                {filter === 'Todos' ? 'Todos os Membros' : filter === 'Ativos' ? 'Apenas Convocáveis' : 'Inativos / Bloqueados'}
              </button>
            );
          })}
        </div>

        {/* Real-time search filter */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar profissional por nome ou função técnica (ex: Som)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-xs text-gray-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white outline-none focus:border-[#7CFF01] dark:focus:border-[#7CFF01] font-semibold"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Staff Catalog list grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-gray-150 rounded-3xl dark:border-zinc-800 bg-zinc-50/20">
          <RefreshCw className="h-7 w-7 text-[#7CFF01] animate-spin" />
          <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Acessando acervo de recursos humanos...</span>
        </div>
      ) : filteredCrew.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-155 rounded-3xl bg-zinc-50/10 dark:border-zinc-850 dark:bg-zinc-950/20">
          <Users className="h-9 w-9 text-gray-300 dark:text-zinc-700 mx-auto stroke-1" />
          <p className="text-xs font-bold text-gray-550 dark:text-zinc-450 mt-2">Nenhum profissional correspondente</p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Tente outro termo ou verifique se o filtro de inativos está marcado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCrew.map((member) => {
            // Find linked user profile name
            const foundUser = usuariosList.find(u => u.id === member.usuario_id);

            return (
              <motion.div
                layout
                key={member.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4.5 shadow-xs hover:shadow-md transition-all duration-200 dark:bg-zinc-900/60 border-gray-150 dark:border-zinc-850/80 ${
                  !member.ativo ? 'opacity-65 saturate-50' : ''
                }`}
              >
                {/* Horizontal flow containing details */}
                <div className="flex items-start gap-3.5">
                  {/* Avatar section */}
                  <div className="relative shrink-0">
                    <img
                      referrerPolicy="no-referrer"
                      src={member.foto_url || 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png'}
                      alt={member.nome}
                      className="h-14 w-14 rounded-full border border-gray-100 dark:border-zinc-800 object-cover bg-gray-50"
                    />
                    
                    {/* Tiny active bubble indicator */}
                    <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                      member.ativo ? 'bg-[#7CFF01]' : 'bg-orange-500'
                    }`} />
                  </div>

                  {/* Body textual content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-extrabold text-gray-950 dark:text-white truncate" title={member.nome}>
                        {member.nome}
                      </h3>
                    </div>

                    <p className="text-[10.5px] font-semibold text-gray-500 dark:text-zinc-400 leading-none">
                      {member.funcao}
                    </p>

                    {/* Check if linked login exists */}
                    <div className="pt-1.5">
                      {member.usuario_id ? (
                        <div className="inline-flex items-center gap-1 rounded-md bg-[#7CFF01]/10 text-[#7CFF01] border border-[#7CFF01]/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                          <span>Vínculo Ativo</span>
                          {foundUser && (
                            <span className="text-gray-450 dark:text-zinc-400 font-sans font-bold normal-case">
                              ({foundUser.nome})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 text-gray-450 border border-gray-200/50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider dark:bg-zinc-950/20 dark:text-zinc-500 dark:border-zinc-850">
                          Sem conta vinculada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info block footer for pricing actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-850/80 flex items-center justify-between">
                  {/* Diaria calculation */}
                  <div>
                    <span className="text-[8px] tracking-wider uppercase font-bold text-gray-400 block dark:text-zinc-500">Valor Diária</span>
                    <span className="text-xs font-black text-gray-950 dark:text-white font-mono leading-none">
                      {member.diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* Interactive controls */}
                  <div className="flex items-center gap-1.5">
                    {/* Soft switch toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(member)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        member.ativo
                          ? 'border-gray-250 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-orange-500/10'
                          : 'border-[#7CFF01]/30 bg-[#7CFF01]/10 text-[#7CFF01] hover:bg-[#7CFF01]/20'
                      }`}
                      title={member.ativo ? 'Inativar profissional' : 'Ativar profissional'}
                    >
                      <Power className="h-3 w-3 stroke-[2.5]" />
                    </button>

                    {/* Edit operational */}
                    <button
                      type="button"
                      onClick={() => openEditForm(member)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-550 hover:bg-gray-100 hover:text-gray-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                      title="Editar registro"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>

                    {/* Permanent deletion */}
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(member.id, member.nome)}
                      className="p-1.5 rounded-lg border border-red-50 text-red-500 hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/10 transition-colors"
                      title="Excluir profissional"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Right Slide-over panel for Employee form CRUD */}
      <AnimatePresence>
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop element */}
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
                className="pointer-events-auto w-screen max-w-md sm:max-w-md"
              >
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl dark:bg-zinc-900">
                  {/* Header of panel */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white dark:bg-zinc-900 px-6 py-5 dark:border-zinc-800">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-[#7CFF01] tracking-widest">Recrutamento ARM</span>
                      <h2 className="text-md sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                        {editingId ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsPanelOpen(false)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Form validation alert container */}
                  {errorMsg && (
                    <div className="m-6 mb-0 flex items-start gap-2.5 bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                      <p>{errorMsg}</p>
                    </div>
                  )}

                  {/* Core fields */}
                  <form onSubmit={handleSaveMemberSubmit} className="flex-1 p-6 space-y-5">
                    
                    {/* Avatar image circular upload field */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 block text-center sm:text-left">
                        Foto / Avatar do Funcionário
                      </label>

                      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-850 bg-zinc-50/10">
                        {/* Circular preview frame */}
                        <div className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gray-550 border-2 border-[#7CFF01] shadow-md">
                          <img
                            referrerPolicy="no-referrer"
                            src={formFotoUrl || 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png'}
                            alt="Preview Avatar"
                            className="w-full h-full object-cover"
                          />
                          {isUploading && (
                            <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center">
                              <RefreshCw className="h-5 w-5 text-[#7CFF01] animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Interactive triggers */}
                        <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                          <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">Escolha uma foto quadrada</p>
                          <p className="text-[9.5px] text-gray-450 dark:text-zinc-500 leading-normal">
                            Carregada digitalmente no preset `equipe` do Cloudinary ARM.
                          </p>

                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handlePhotoUpload(f);
                            }}
                          />

                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="active-click flex h-7 items-center justify-center gap-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[10px] font-extrabold text-gray-850 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-45"
                            >
                              <Upload className="h-3 w-3" />
                              <span>{isUploading ? 'Enviando...' : 'Carregar Foto'}</span>
                            </button>

                            {formFotoUrl && (
                              <button
                                type="button"
                                onClick={() => setFormFotoUrl('')}
                                className="h-7 px-2.5 rounded-lg border border-red-150 text-red-500 hover:bg-red-50 text-[10px] font-extrabold dark:border-red-950/20 dark:hover:bg-red-950/10"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Name field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Nome Completo do Colaborador
                      </label>
                      <input
                        type="text"
                        required
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: Carlos Oliveira de Paula"
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                      />
                    </div>

                    {/* Technical skill role */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Função / Cargo Técnico Principal
                      </label>
                      <input
                        type="text"
                        required
                        value={formFuncao}
                        onChange={(e) => setFormFuncao(e.target.value)}
                        placeholder="Ex: Técnico de Som PA, Iluminador, Roadie..."
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                        list="cargo-sugestoes"
                      />
                      <datalist id="cargo-sugestoes">
                        <option value="Técnico de Som PA" />
                        <option value="Técnico de Iluminação" />
                        <option value="Auxiliar de Iluminação" />
                        <option value="Técnico de Vídeo / Painel LED" />
                        <option value="Auxiliar de Montagem (Roadie)" />
                        <option value="DJ Residente" />
                      </datalist>
                    </div>

                    {/* Preço de diária monetário */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Valor Comercial da Diária (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={formDiaria}
                          onChange={(e) => setFormDiaria(e.target.value)}
                          placeholder="250.00"
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 pl-9 text-xs font-bold text-gray-950 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-zinc-550 leading-tight">
                        Seu valor será salvo como Float decimal padrão no banco no campo `diaria`.
                      </p>
                    </div>

                    {/* Dropdown "Conta Vinculada" matching firebase user collection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">
                        Acesso de Conta Vinculada
                      </label>
                      <select
                        value={formUsuarioId}
                        onChange={(e) => setFormUsuarioId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-[#7CFF01] dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                      >
                        <option value="">Nenhum / Sem login ainda</option>
                        {usuariosList.map((usr) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 leading-normal">
                        Mapeia o ID do usuário cadastrado na coleção `usuarios` para vincular este integrante à sua respectiva sessão.
                      </p>
                    </div>

                    {/* State toggle switch */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/30 border border-gray-100 dark:border-zinc-850 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-gray-900 dark:text-white">Ativo</p>
                        <p className="text-[9.5px] text-gray-400 dark:text-zinc-500">
                          Membros inativos não aparecerão nas grades rápidas de eventos futuros.
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

                    {/* Operational Commands Button strip */}
                    <div className="flex gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsPanelOpen(false)}
                        className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
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
                            <span>Confirmar Dados</span>
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
