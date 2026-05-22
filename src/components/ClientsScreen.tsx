import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Check, Trash2, Edit, MessageSquare, Phone, 
  Mail, MapPin, Sparkles, Filter, RefreshCw, X, UploadCloud, 
  UserPlus, Award, AlertTriangle, Building, CreditCard
} from 'lucide-react';
import { Client } from '../types';
import { INITIAL_CLIENTS, loadData, saveData } from '../data';
import { 
  getFirebaseDb, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  // Custom delete confirmation and view details states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  // Form Fields
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numeroAddress, setNumeroAddress] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [fotoCliente, setFotoCliente] = useState('');
  const [tipoCliente, setTipoCliente] = useState<'Lead frio' | 'Lead quente' | 'Cliente oficial' | 'Cliente VIP'>('Lead frio');

  // Auxiliary states
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load clients on mount
  const fetchClients = async () => {
    setIsLoading(true);
    const db = getFirebaseDb();
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        const loaded: Client[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            nomeCompleto: data.nomeCompleto || '',
            name: data.nomeCompleto || '', // backup
            cpf: data.cpf || '',
            cep: data.cep || '',
            logradouro: data.logradouro || '',
            numeroAddress: data.numeroAddress || '',
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            complemento: data.complemento || '',
            telefone: data.telefone || '',
            phone: data.telefone || '', // backup
            email: data.email || '',
            fotoCliente: data.fotoCliente || '',
            tipoCliente: data.tipoCliente || 'Lead frio',
            whatsappMessage: data.whatsappMessage || ''
          });
        });

        // Sort by ID / timestamp (if there are no clients yet, empty is fine)
        setClients(loaded);
        saveData('clients_v2', loaded);
      } catch (err) {
        console.warn('Erro ao buscar clientes no Firestore, usando fallback local:', err);
        const localOnly = loadData<Client>('clients_v2', []);
        setClients(localOnly);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sandboxed Offline Mode
      const localOnly = loadData<Client>('clients_v2', []);
      setClients(localOnly);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Format CPF
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Validate CPF
  const validateCPF = (val: string): boolean => {
    const clean = val.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(10))) return false;
    return true;
  };

  // Format CEP
  const formatCEP = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Format Telefone (ex: (11) 98888-7777 ou (11) 8888-7777)
  const formatTelefone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Search Address by CEP
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setFormError('O CEP deve conter 8 dígitos.');
      return;
    }
    setIsSearchingCep(true);
    setFormError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error('Falha na resposta do ViaCEP.');
      const data = await response.json();
      if (data.erro) {
        setFormError('CEP não encontrado. Digite os dados do endereço manualmente.');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
      }
    } catch (err) {
      setFormError('Erro ao consultar CEP. Digite os dados manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Cloudinary image upload configured for "perfil_clientes"
  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'perfil_clientes');

      const response = await fetch('https://api.cloudinary.com/v1_1/dnatvwcxy/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar a imagem para o Cloudinary.');
      }

      const data = await response.json();
      if (data.secure_url) {
        setFotoCliente(data.secure_url);
        setSuccessMsg('Foto carregada com sucesso!');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        throw new Error('Resposta de upload inválida.');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Erro ao carregar a foto do cliente.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Trigger modal for New Client
  const handleOpenNewModal = () => {
    setEditClient(null);
    setNomeCompleto('');
    setCpf('');
    setCep('');
    setLogradouro('');
    setNumeroAddress('');
    setBairro('');
    setCidade('');
    setEstado('');
    setComplemento('');
    setTelefone('');
    setEmail('');
    setFotoCliente('');
    setTipoCliente('Lead frio');
    setFormError('');
    setShowFormModal(true);
  };

  // Trigger modal for editing
  const handleOpenEditModal = (client: Client) => {
    setEditClient(client);
    setNomeCompleto(client.nomeCompleto);
    setCpf(formatCPF(client.cpf));
    setCep(formatCEP(client.cep));
    setLogradouro(client.logradouro);
    setNumeroAddress(client.numeroAddress);
    setBairro(client.bairro);
    setCidade(client.cidade);
    setEstado(client.estado);
    setComplemento(client.complemento);
    setTelefone(formatTelefone(client.telefone));
    setEmail(client.email);
    setFotoCliente(client.fotoCliente);
    setTipoCliente(client.tipoCliente);
    setFormError('');
    setShowFormModal(true);
  };

  // Delete customer record completely
  const handleDeleteClient = async (id: string) => {
    setIsDeletingId(id);
    const db = getFirebaseDb();
    const updated = clients.filter(c => c.id !== id);
    
    if (db) {
      try {
        await deleteDoc(doc(db, 'clientes', id));
        setClients(updated);
        saveData('clients_v2', updated);
      } catch (err) {
        console.error('Erro ao deletar cliente do Firestore:', err);
        // Cascade local fallback
        setClients(updated);
        saveData('clients_v2', updated);
      } finally {
        setIsDeletingId(null);
      }
    } else {
      setClients(updated);
      saveData('clients_v2', updated);
      setIsDeletingId(null);
    }
  };

  // Save/Edit action handler
  const handleSaveClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nomeCompleto.trim()) {
      setFormError('O Nome Completo do cliente é obrigatório.');
      return;
    }

    if (!telefone.trim()) {
      setFormError('O celular / telefone de contato é obrigatório.');
      return;
    }

    if (cpf.trim() && !validateCPF(cpf)) {
      setFormError('O CPF informado é inválido. Revise ou apague o campo.');
      return;
    }

    setIsSaving(true);
    
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanCep = cep.replace(/\D/g, '');
    const cleanTelefone = telefone.replace(/\D/g, '');

    const clientId = editClient ? editClient.id : 'client_' + Date.now();

    const clientData: Client = {
      id: clientId,
      nomeCompleto: nomeCompleto.trim(),
      name: nomeCompleto.trim(), // sync fallback
      cpf: cleanCpf,
      cep: cleanCep,
      logradouro: logradouro.trim(),
      numeroAddress: numeroAddress.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim().toUpperCase(),
      complemento: complemento.trim(),
      telefone: cleanTelefone,
      phone: cleanTelefone, // sync fallback
      email: email.trim(),
      fotoCliente: fotoCliente || '',
      tipoCliente: tipoCliente,
      whatsappMessage: `Olá ${nomeCompleto.split(' ')[0]}, tudo bem? Gostaria de saber mais sobre seu evento!`
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'clientes', clientId), clientData);
        
        let updated: Client[];
        if (editClient) {
          updated = clients.map(c => c.id === clientId ? clientData : c);
        } else {
          updated = [clientData, ...clients];
        }
        setClients(updated);
        saveData('clients_v2', updated);
        
        setSuccessMsg(editClient ? 'Cliente alterado!' : 'Novo cliente cadastrado com sucesso!');
        setTimeout(() => {
          setSuccessMsg('');
          setShowFormModal(false);
        }, 1500);

      } catch (err: any) {
        console.error(err);
        setFormError('Erro ao gravar cliente no Firestore. Verifique as regras de segurança.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `clientes/${clientId}`);
        } catch (inner) {}
      } finally {
        setIsSaving(false);
      }
    } else {
      // Sandbox fallback storage save
      let updated: Client[];
      if (editClient) {
        updated = clients.map(c => c.id === clientId ? clientData : c);
      } else {
        updated = [clientData, ...clients];
      }
      setClients(updated);
      saveData('clients_v2', updated);

      setSuccessMsg(editClient ? 'Alteraçõe salvas localmente!' : 'Cliente cadastrado localmente!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowFormModal(false);
      }, 1500);
      setIsSaving(false);
    }
  };

  // Open WhatsApp chat directly
  const handleOpenWhatsappMsg = (client: Client) => {
    const message = encodeURIComponent(client.whatsappMessage || `Olá ${client.nomeCompleto.split(' ')[0]}, tudo bem? Gostaria de saber mais sobre seu evento!`);
    const link = `https://wa.me/55${client.telefone}?text=${message}`;
    window.open(link, '_blank', 'referrerPolicy="no-referrer"');
  };

  // Gather distinct cities for dynamically compiling city filter dropdown list
  const distinctCities = Array.from(
    new Set(clients.map(c => c.cidade).filter(city => city && city.trim() !== ''))
  ).sort();

  // Active filters trigger
  const filteredClients = clients.filter(client => {
    const matchSearch = 
      client.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
      client.cpf.includes(search.replace(/\D/g, '')) ||
      client.telefone.includes(search.replace(/\D/g, '')) ||
      (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
      (client.cidade && client.cidade.toLowerCase().includes(search.toLowerCase()));

    const matchCity = filterCity ? client.cidade === filterCity : true;
    const matchType = filterType ? client.tipoCliente === filterType : true;

    return matchSearch && matchCity && matchType;
  });

  // Client Status Pills style helper
  const getStatusStyle = (type: string) => {
    switch (type) {
      case 'Lead quente':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
          dot: 'bg-amber-500'
        };
      case 'Cliente oficial':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
          dot: 'bg-emerald-500'
        };
      case 'Cliente VIP':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/25 dark:text-indigo-400 dark:border-indigo-900/40',
          dot: 'bg-indigo-500'
        };
      default: // Lead frio
        return {
          bg: 'bg-zinc-50 text-zinc-650 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800',
          dot: 'bg-zinc-400'
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header and New Customer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-primary">Plataforma ERP</span>
          <h2 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white mt-0.5">Gestão de Clientes</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Gerencie leads, envie mensagens e organize cadastros oficiais.</p>
        </div>
        <button
          onClick={handleOpenNewModal}
          id="btn-new-customer"
          className="active-click flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-gray-950 shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Advanced Filter Segment */}
      <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-xs dark:border-zinc-850 dark:bg-zinc-900/40 space-y-3">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, CPF, cidade, e-mail ou WhatsApp..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/20 py-2.5 pr-4 pl-10.5 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-primary"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 hover:text-gray-650"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Select Filters Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-850 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Filtrar por Status (Todos)</option>
              <option value="Lead frio">❄️ Lead Frio</option>
              <option value="Lead quente">🔥 Lead Quente</option>
              <option value="Cliente oficial">🤝 Cliente Oficial</option>
              <option value="Cliente VIP">👑 Cliente VIP</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-850 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Filtrar por Cidade (Todas)</option>
              {distinctCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset active filters label */}
        {(filterCity || filterType || search) && (
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Resultados: <strong className="text-gray-800 dark:text-zinc-300 font-extrabold">{filteredClients.length}</strong> encontrados</span>
            <button
              onClick={() => {
                setSearch('');
                setFilterCity('');
                setFilterType('');
              }}
              className="font-bold text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Main interactive loading placeholder */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-gray-450">Buscando clientes no Firestore...</p>
        </div>
      ) : (
        /* Clients Listing Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, index) => {
              const styles = getStatusStyle(client.tipoCliente);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  key={client.id}
                  className="rounded-2xl border border-gray-150 bg-white p-5 shadow-xs hover:shadow-md transition-all dark:border-zinc-850 dark:bg-zinc-900/60 flex flex-col justify-between cursor-pointer hover:border-primary/40 dark:hover:border-primary/40 group relative overflow-hidden"
                  onClick={() => setSelectedClientDetails(client)}
                  title="Ver detalhes do cliente"
                >
                  {/* Subtle hover detail indicator bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/0 group-hover:bg-primary/80 transition-colors" />

                  <div className="space-y-3">
                    {/* Customer Header Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="h-12 w-12 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center relative">
                        <img 
                          src={client.fotoCliente || "https://images.vexels.com/media/users/3/132335/isolated/preview/4af43ce1082231cba5e5aa60fbb03f2f-icones-de-circulo-de-staffs.png"} 
                          alt={client.nomeCompleto} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover bg-white"
                        />
                        <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${styles.dot}`} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 border rounded-lg px-2 py-0.5 text-[9.5px] font-black ${styles.bg}`}>
                            {client.tipoCliente}
                          </span>
                          {client.cpf && (
                            <span className="text-[9px] font-semibold text-gray-400 dark:text-zinc-500 font-mono hidden sm:inline">
                              CPF: {formatCPF(client.cpf)}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-950 dark:text-white truncate group-hover:text-primary transition-colors" title={client.nomeCompleto}>
                          {client.nomeCompleto}
                        </h4>
                      </div>
                    </div>

                    {/* Customer Metadata Profile fields */}
                    <div className="space-y-1.5 border-t border-gray-100/60 dark:border-zinc-800/40 pt-3 text-[11px] leading-relaxed text-gray-550 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono">{formatTelefone(client.telefone)}</span>
                      </div>
                      
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}

                      {client.logradouro && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="truncate">
                            {client.logradouro}, {client.numeroAddress} {client.bairro ? ` - ${client.bairro}` : ''} {client.cidade ? ` - ${client.cidade}/${client.estado}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar Footer */}
                  <div className="flex items-center justify-between border-t border-gray-105 dark:border-zinc-800/30 pt-3.5 mt-4" onClick={(e) => e.stopPropagation()}>
                    {/* Delete guarded item trigger via custom confirmation */}
                    <div>
                      {isDeletingId === client.id ? (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-pulse">
                          Excluindo...
                        </span>
                      ) : confirmDeleteId === client.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-xl border border-red-100 dark:border-red-900/30">
                          <span className="text-[10px] text-red-650 dark:text-red-400 font-black px-1">Excluir?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(client.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2 py-1 text-[9.5px] font-black transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1 text-[9.5px] font-bold transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(client.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-[11px] font-bold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      )}
                    </div>

                    {/* Direct Contact & Edit buttons in grid */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(client);
                        }}
                        className="rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-850 p-2 text-gray-800 dark:text-zinc-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>

                      <span className="text-[10px] font-bold text-primary dark:text-primary/90 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline ml-1 font-sans">
                        Ver ficha →
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredClients.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400 dark:text-zinc-500">
              <AlertTriangle className="h-8 w-8 text-gray-350 mx-auto mb-2" />
              <p className="text-sm font-bold">Nenhum cliente atende aos filtros definidos.</p>
              <p className="text-[10.5px] mt-1">Pesquise por outros termos ou cadastre um novo cliente agora.</p>
            </div>
          )}
        </div>
      )}

      {/* Modern interactive Add/Edit Client Drawer / Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-hidden">
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl max-h-[90vh] rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col my-auto overflow-hidden"
          >
            {/* Modal Title Bar - Always Static At Top */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 dark:border-zinc-800 shrink-0">
              <div>
                <span className="text-[9px] uppercase font-black tracking-wider text-primary">Cadastro Unificado</span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                  {editClient ? 'Editar Cadastro do Cliente' : 'Adicionar Novo Cliente'}
                </h3>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error alerts - Static Below Header */}
            {formError && (
              <div id="client-error-alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400 flex items-center gap-1.5 animate-bounce shrink-0">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Success message - Static Below Header */}
            {successMsg && (
              <div id="client-success-alert" className="mt-3 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-400 flex items-center gap-1.5 shrink-0">
                <Check className="h-4 w-4 shrink-0 animate-ping" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Customer Inputs Form */}
            <form onSubmit={handleSaveClientForm} className="mt-4 flex flex-col flex-1 min-h-0">
              
              {/* Scrollable Container for inputs */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-205">
                
                {/* Photo & TipoCliente Row Upload Block */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-gray-100/60 dark:border-zinc-800/40">
                  <div className="relative shrink-0">
                    <img 
                      referrerPolicy="no-referrer"
                      src={fotoCliente || "https://images.vexels.com/media/users/3/132335/isolated/preview/4af43ce1082231cba5e5aa60fbb03f2f-icones-de-circulo-de-staffs.png"} 
                      alt="Foto do cliente" 
                      className="h-16 w-16 rounded-xl border border-gray-200 bg-white object-cover shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                  
                  <div className="flex-1 w-full text-center sm:text-left space-y-1.5">
                    <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Foto de Perfil do Cliente</p>
                    <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 leading-normal">
                      Enviado com segurança para a pasta residencial do Cloudinary (`perfil_clientes`).
                    </p>
                    
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoUpload(file);
                        }
                      }}
                    />
                    
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="rounded-lg bg-primary/20 hover:bg-primary/30 text-gray-950 px-3 py-1.5 text-[10px] font-extrabold transition-colors disabled:opacity-50"
                      >
                        {isUploadingPhoto ? 'Carregando Imagem...' : 'Enviar Nova Foto'}
                      </button>
                      {fotoCliente && (
                        <button
                          type="button"
                          onClick={() => setFotoCliente('')}
                          className="rounded-lg bg-red-55 hover:bg-red-100 text-red-650 dark:bg-red-950/20 dark:hover:bg-red-905/40 px-2 py-1.5 text-[10px] font-bold transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid 1: Basic Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Ex: Roberto Carlos Silva"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400">CPF do Cliente</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Grid 2: Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400">Telefone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                      placeholder="Ex: (11) 98888-8888"
                      maxLength={15}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: cliente.corporativo@email.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>

                {/* Grid 3: Status Classifier */}
                <div className="grid grid-cols-1 gap-3.5 border-t border-gray-100 dark:border-zinc-800 pt-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400">Classificação / Tipo de Cliente</label>
                    <select
                      value={tipoCliente}
                      onChange={(e) => setTipoCliente(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                    >
                      <option value="Lead frio">❄️ Lead Frio (Inicio do Funil)</option>
                      <option value="Lead quente">🔥 Lead Quente (Interesse Ativo)</option>
                      <option value="Cliente oficial">🤝 Cliente Oficial (Fechou Contratos)</option>
                      <option value="Cliente VIP">👑 Cliente VIP (Parceiro Frequente / Importante)</option>
                    </select>
                  </div>
                </div>

                {/* Sede & Address CEP Autocomplete */}
                <div className="space-y-3.5 border-t border-gray-100 dark:border-zinc-800/80 pt-3">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Dados Residenciais / Local de Faturamento</span>
                  
                  {/* CEP Input with search CTA */}
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">CEP</label>
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(formatCEP(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleCepSearch}
                        disabled={isSearchingCep || !cep}
                        className="active-click h-10 rounded-xl bg-gray-950 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 hover:bg-gray-850 px-4 text-xs font-bold transition-all disabled:opacity-40"
                      >
                        {isSearchingCep ? 'Buscando...' : 'Buscar CEP'}
                      </button>
                    </div>
                  </div>

                  {/* Logradouro + Número Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Rua / Logradouro</label>
                      <input
                        type="text"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        placeholder="Identifique o CEP acima ou digite..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Número</label>
                      <input
                        type="text"
                        value={numeroAddress}
                        onChange={(e) => setNumeroAddress(e.target.value)}
                        placeholder="Ex: 50"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Bairro + Cidade + Estado Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Bairro</label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Ex: Centro"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Cidade</label>
                      <input
                        type="text"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-905 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Estado / UF</label>
                      <input
                        type="text"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        placeholder="Ex: SP"
                        maxLength={2}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-905 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-zinc-400">Complemento (Opcional)</label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Ex: Bloco B, Sala 101"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-905 outline-none focus:border-primary dark:border-zinc-805 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>

              </div>

              {/* Botões do Modal - Always Sticky At Bottom */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-1/2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-655 transition-all hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingPhoto}
                  className="w-1/2 rounded-xl bg-primary py-2.5 text-xs font-bold text-gray-950 shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Selected Customer Details Ficha / Panel Drawer Modal */}
      {selectedClientDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-hidden"
          onClick={() => setSelectedClientDetails(null)}
        >
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col my-auto overflow-hidden text-gray-900 dark:text-white"
          >
            {/* Header section with profile photo, name details to provide maximum clarity */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 dark:border-zinc-800 shrink-0">
              <div>
                <span className="text-[9px] uppercase font-black tracking-wider text-primary">Ficha Completa do Cliente</span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                  Visualizar Cadastro
                </h3>
              </div>
              <button 
                onClick={() => setSelectedClientDetails(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Fechar ficha"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Customer Ficha Profile Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 my-4 sticky-scroll-thin text-xs">
              
              {/* Profile Card Header Block */}
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 dark:bg-zinc-900/30 dark:border-zinc-800/40 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img 
                  src={selectedClientDetails.fotoCliente || "https://images.vexels.com/media/users/3/132335/isolated/preview/4af43ce1082231cba5e5aa60fbb03f2f-icones-de-circulo-de-staffs.png"} 
                  alt={selectedClientDetails.nomeCompleto} 
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-2xl border border-gray-200 bg-white object-cover shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                />
                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase ${
                    getStatusStyle(selectedClientDetails.tipoCliente).bg
                  }`}>
                    {selectedClientDetails.tipoCliente}
                  </span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white leading-snug">
                    {selectedClientDetails.nomeCompleto}
                  </h4>
                  {selectedClientDetails.cpf && (
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono font-semibold">
                      CPF: {formatCPF(selectedClientDetails.cpf)}
                    </p>
                  )}
                </div>
              </div>

              {/* Informações de Contato Row Layout */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Informações de Contato</span>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-gray-50/40 border border-gray-100/50 p-3 rounded-xl dark:bg-zinc-900/10 dark:border-zinc-800/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-gray-950 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Telefone / WhatsApp</p>
                        <p className="font-mono font-bold text-gray-900 dark:text-zinc-150">{formatTelefone(selectedClientDetails.telefone)}</p>
                      </div>
                    </div>
                    {/* Quick call/message triggers */}
                    <a 
                      href={`tel:${selectedClientDetails.telefone.replace(/\D/g, '')}`}
                      className="px-2.5 py-1.5 bg-gray-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 hover:bg-gray-800 rounded-lg text-[10px] font-bold transition-all text-center shrink-0"
                    >
                      Ligar
                    </a>
                  </div>

                  {selectedClientDetails.email && (
                    <div className="bg-gray-50/40 border border-gray-100/50 p-3 rounded-xl dark:bg-zinc-900/10 dark:border-zinc-800/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-gray-950 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Endereço de E-mail</p>
                          <p className="font-semibold text-gray-905 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-xs">{selectedClientDetails.email}</p>
                        </div>
                      </div>
                      <a 
                        href={`mailto:${selectedClientDetails.email}`}
                        className="px-2.5 py-1.5 bg-gray-100 text-gray-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all text-center shrink-0"
                      >
                        Enviar E-mail
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço Residencial ou de Faturamento */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Local de Instalação / Faturamento</span>
                <div className="bg-gray-50/40 border border-gray-100/50 p-3.5 rounded-2xl dark:bg-zinc-900/10 dark:border-zinc-800/20 space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      {selectedClientDetails.logradouro ? (
                        <>
                          <p className="text-gray-900 dark:text-white font-bold leading-normal">
                            {selectedClientDetails.logradouro}, Nº {selectedClientDetails.numeroAddress}
                          </p>
                          {selectedClientDetails.complemento && (
                            <p className="text-gray-500 dark:text-zinc-400 font-semibold bg-gray-100 dark:bg-zinc-850 inline-block px-1.5 py-0.5 rounded text-[10px] mt-0.5">
                              Comp: {selectedClientDetails.complemento}
                            </p>
                          )}
                          <p className="text-gray-500 dark:text-zinc-400 font-semibold mt-1">
                            Bairro: {selectedClientDetails.bairro || 'Não informado'}
                          </p>
                          <p className="text-gray-500 dark:text-zinc-400 font-semibold">
                            Cidade: {selectedClientDetails.cidade || 'Não informada'} / UF: {selectedClientDetails.estado || 'SP'}
                          </p>
                          {selectedClientDetails.cep && (
                            <p className="text-[10.5px] font-mono font-bold text-gray-400 dark:text-zinc-500 mt-2">
                              CEP: {selectedClientDetails.cep}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-450 italic">Endereço não cadastrado para este cliente.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions footer buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950 mt-2">
              <button
                type="button"
                onClick={() => setSelectedClientDetails(null)}
                className="w-1/2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-655 transition-all hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Fechar Ficha
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const clientToEdit = selectedClientDetails;
                  setSelectedClientDetails(null);
                  handleOpenEditModal(clientToEdit);
                }}
                className="w-1/2 rounded-xl bg-primary py-2.5 text-xs font-bold text-gray-950 shadow-sm transition-all hover:bg-primary/95 flex items-center justify-center gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Editar Cadastro</span>
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </div>
  );
}
