import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Calendar, User, DollarSign, X, 
  Briefcase, ChevronRight, Search, Filter, Check, 
  Trash2, Building, ChevronDown, MapPin, RotateCcw, 
  Sparkles, Clock, ArrowRight, Send, Copy, Edit2, 
  Settings, CheckCircle, HelpCircle, ArrowUpRight,
  ArrowLeft, Printer, Scale, Lock, Package, Users, Volume2
} from 'lucide-react';
import { DocumentItem, Orcamento, Client, PackageCombo, Contrato, CompanyConfig } from '../types';
import { INITIAL_DOCUMENTS, loadData, saveData } from '../data';
import { 
  getFirebaseDb, 
  OperationType, 
  handleFirestoreError 
} from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';

// Initial default budgets loaded when none are present in database or local storage
const INITIAL_ORCAMENTOS: Orcamento[] = [
  {
    id: 'orc1',
    cliente: {
      nomeCompleto: 'Arthur Roberto de Melo',
      cpf: '123.456.789-01',
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      numeroAddress: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      complemento: 'Apto 42',
      telefone: '11999999999',
      email: 'arthur.melo@empresa.com.br'
    },
    evento: {
      tipo_evento: 'Sonorização Corporativa',
      data_evento: '2026-05-28',
      local_evento: 'Espaço Paulista Eventos',
      taxa_deslocamento: 150
    },
    pacote: {
      pacoteId: 'pkg1',
      pacoteNome: 'Sonorização Executiva',
      pacotePreco: 2500,
      subtotal: 2500,
      taxaDeslocamento: 150,
      valorTotal: 2650,
      itens: [
        { id: 'i1', descricao: 'Line Array Ativo RCF 10"', quantidade: 2, precoUnitario: 225 },
        { id: 'i2', descricao: 'Subwoofer Ativo RCF 18"', quantidade: 2, precoUnitario: 150 },
        { id: 'i3', descricao: 'Mesa de Som Behringer X32', quantidade: 1, precoUnitario: 350 }
      ]
    },
    dataEvento: '2026-05-28',
    horarioInicio: '14:00',
    localEvento: 'Espaço Paulista Eventos',
    status: 'proposta_solicitada',
    createdAt: '2026-05-25T11:40:51.000Z',
    versao: 1
  },
  {
    id: 'orc2',
    cliente: {
      nomeCompleto: 'Amanda Souza Produções',
      cpf: '987.654.321-09',
      cep: '22041-001',
      logradouro: 'Rua Barata Ribeiro',
      numeroAddress: '250',
      bairro: 'Copacabana',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      complemento: 'Sala 505',
      telefone: '21988888888',
      email: 'amanda.souza@producoes.com'
    },
    evento: {
      tipo_evento: 'Casamento Nobre',
      data_evento: '2026-06-15',
      local_evento: 'Buffet Copacabana Palace',
      taxa_deslocamento: 300
    },
    pacote: {
      pacoteId: 'pkg2',
      pacoteNome: 'Pacote Luz e Som Premium',
      pacotePreco: 4200,
      subtotal: 4200,
      taxaDeslocamento: 300,
      valorTotal: 4500,
      itens: [
        { id: 'i1', descricao: 'Moving Head LED Beam 230W 7R', quantidade: 4, precoUnitario: 180 },
        { id: 'i2', descricao: 'Canhão Refletor LED Par 64 RGBW', quantidade: 8, precoUnitario: 50 },
        { id: 'i3', descricao: 'Estrutura Box Truss Q30 (Metro)', quantidade: 12, precoUnitario: 25 }
      ]
    },
    dataEvento: '2026-06-15',
    horarioInicio: '18:00',
    localEvento: 'Buffet Copacabana Palace',
    status: 'pronto_para_envio',
    createdAt: '2026-05-24T10:00:00.000Z',
    versao: 1
  },
  {
    id: 'orc3',
    cliente: {
      nomeCompleto: 'Prefeitura Municipal de Blumenau',
      cpf: '000.111.222-33',
      cep: '89010-000',
      logradouro: 'Praça Victor Konder',
      numeroAddress: '2',
      bairro: 'Centro',
      cidade: 'Blumenau',
      estado: 'SC',
      complemento: 'Gabinete',
      telefone: '4733816000',
      email: 'licitacoes@blumenau.sc.gov.br'
    },
    evento: {
      tipo_evento: 'Festival de Música',
      data_evento: '2026-06-25',
      local_evento: 'Parque Vila Germânica',
      taxa_deslocamento: 500
    },
    pacote: {
      pacoteId: 'pkg3',
      pacoteNome: 'Palco Principal Completo',
      pacotePreco: 11000,
      subtotal: 11000,
      taxaDeslocamento: 500,
      valorTotal: 11500,
      itens: [
        { id: 'i1', descricao: 'Line Array Ativo RCF 10" (Par)', quantidade: 8, precoUnitario: 450 },
        { id: 'i2', descricao: 'Subwoofer Ativo RCF 18" (Unidade)', quantidade: 8, precoUnitario: 300 },
        { id: 'i3', descricao: 'Palco Box Truss Q30 Completo', quantidade: 1, precoUnitario: 2500 }
      ]
    },
    dataEvento: '2026-06-25',
    horarioInicio: '10:00',
    localEvento: 'Parque Vila Germânica',
    status: 'rejeitado',
    createdAt: '2026-05-20T08:00:00.000Z',
    versao: 1
  }
];

const INITIAL_CONTRATOS: Contrato[] = [
  {
    id: 'ct1',
    clienteId: 'c1',
    contratanteCidade: 'São Paulo',
    contratanteCpf: '123.456.789-01',
    contratanteEndereco: 'Avenida Paulista',
    contratanteEstado: 'SP',
    contratanteNome: 'Arthur Roberto de Melo',
    contratanteNumero: '1000',
    createdAt: { seconds: 1779424576, nanoseconds: 0 },
    dataAssinatura: '28 de maio de 2026',
    dataCriacao: '28 de maio de 2026',
    dataEvento: { seconds: 1779840000, nanoseconds: 0 },
    eventoId: 'e1',
    listaEquipamentos: [
      { nome: 'Line Array Ativo RCF 10" (Par)', quantidade: 2 },
      { nome: 'Subwoofer Ativo RCF 18" (Unidade)', quantidade: 2 },
      { nome: 'Mesa de Som Behringer X32', quantidade: 1 }
    ],
    listaEquipe: [
      { nome: 'Carlos Oliveira', funcao: 'Técnico de PA / Master' },
      { nome: 'Júlio Silva', funcao: 'Auxiliar de Montagem (Roadie)' }
    ],
    localEvento: 'Espaço Paulista Eventos',
    pacoteId: 'pkg1',
    pacoteItens: [
      { id: 'custom_item_1779711470706', descricao: 'Iluminação Decorativa LED Par', precoUnitario: 50, quantidade: 6 },
      { id: 'custom_item_1779711470707', descricao: 'Moving Head Pro', precoUnitario: 150, quantidade: 2 }
    ],
    pacoteNome: 'Sonorização Executiva + Luzes',
    status: 'assinado',
    valorEntrada30: 840,
    valorInvestimento: 2800,
    valorInvestimentoExtenso: 'dois mil e oitocentos reais',
    valorRestante70: 1960
  }
];

const formatDateToBR = (dateVal: any): string => {
  if (!dateVal) return '';

  // Handle Firestore Timestamp object or seconds/nanoseconds shape
  if (typeof dateVal === 'object' && dateVal !== null) {
    if (typeof dateVal.seconds === 'number') {
      const d = new Date(dateVal.seconds * 1000);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  if (typeof dateVal === 'string') {
    // Already in Brazilian Format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
      return dateVal;
    }
    const cleanDateStr = dateVal.split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
  }

  return String(dateVal);
};

const formatDateToISO = (dateVal: any): string => {
  if (!dateVal) return '';

  if (typeof dateVal === 'object' && dateVal !== null) {
    if (typeof dateVal.seconds === 'number') {
      const d = new Date(dateVal.seconds * 1000);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}-${day}`;
    }
  }

  if (typeof dateVal === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
      const parts = dateVal.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const cleanDateStr = dateVal.split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  }

  return '';
};

const formatLocationOrAddress = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const parts: string[] = [];
    if (val.rua) parts.push(String(val.rua));
    else if (val.logradouro) parts.push(String(val.logradouro));

    if (val.numero) parts.push(String(val.numero));
    else if (val.numeroAddress) parts.push(String(val.numeroAddress));

    if (val.complemento) parts.push(`(${val.complemento})`);
    if (val.bairro) parts.push(String(val.bairro));
    if (val.cidade) parts.push(String(val.cidade));
    if (val.uf) parts.push(String(val.uf));
    else if (val.estado) parts.push(String(val.estado));

    if (parts.length === 0) {
      if (val.local_evento) return String(val.local_evento);
      if (val.nome) return String(val.nome);
      return Object.entries(val)
        .filter(([k, v]) => k !== 'taxa_deslocamento' && typeof v !== 'object')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return parts.join(', ');
  }
  return String(val);
};

const parseAddressIntoFields = (val: any) => {
  const fields = {
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  };

  if (!val) return fields;

  if (typeof val === 'object') {
    fields.cep = val.cep || val.endereco_cep || val.endereco_cep || '';
    fields.rua = val.rua || val.logradouro || val.endereco_rua || '';
    fields.numero = val.numero || val.numeroAddress || val.endereco_numero || '';
    fields.bairro = val.bairro || val.endereco_bairro || '';
    fields.cidade = val.cidade || val.endereco_cidade || '';
    fields.estado = val.uf || val.estado || val.endereco_estado || '';
    fields.complemento = val.complemento || val.endereco_complemento || '';
    return fields;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedObj = JSON.parse(trimmed);
        return parseAddressIntoFields(parsedObj);
      } catch (e) {
        // ignore
      }
    }
    fields.rua = val;
    return fields;
  }

  return fields;
};

const compileAddressToString = (addr: any) => {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.rua) parts.push(addr.rua);
  if (addr.numero) parts.push(addr.numero);
  if (addr.complemento) parts.push(`(${addr.complemento})`);
  if (addr.bairro) parts.push(addr.bairro);
  if (addr.cidade || addr.estado) {
    if (addr.cidade && addr.estado) {
      parts.push(`${addr.cidade}-${addr.estado}`);
    } else {
      if (addr.cidade) parts.push(addr.cidade);
      if (addr.estado) parts.push(addr.estado);
    }
  }
  if (addr.cep) parts.push(`CEP: ${addr.cep}`);
  return parts.join(', ');
};

export default function DocumentsScreen({ company }: { company: CompanyConfig }) {
  const [activeTab, setActiveTab] = useState<'orcamento' | 'contrato'>('orcamento');
  
  // Contracts list (handled via Firestore "contratos" and localStorage offline backup)
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  
  // Real Firestore-linked or locally fallbacked budgets
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Workflow sub-tabs for budgets
  const [budgetSubTab, setBudgetSubTab] = useState<'pending' | 'sent' | 'finalized'>('pending');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [finalizedStatusFilter, setFinalizedStatusFilter] = useState<'todas' | 'aprovado' | 'rejeitado'>('todas');
  const [contratoStatusFilter, setContratoStatusFilter] = useState<'todos' | 'em análise' | 'aguardando assinatura' | 'assinado' | 'cancelado'>('todos');

  // Available client profile database (for autocomplete selection)
  const [availClients, setAvailClients] = useState<Client[]>([]);
  // Available package database (for autocomplete selection)
  const [availPackages, setAvailPackages] = useState<PackageCombo[]>([]);

  // Modals visibility toggles
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [isEditingOrcamento, setIsEditingOrcamento] = useState(false);
  
  // Simple contract modal
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [contractClient, setContractClient] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [contractStatus, setContractStatus] = useState<string>('assinado');
  
  // Additional fields for editing
  const [contratanteCidade, setContratanteCidade] = useState('');
  const [contratanteCpf, setContratanteCpf] = useState('');
  const [contratanteEndereco, setContratanteEndereco] = useState('');
  const [contratanteEstado, setContratanteEstado] = useState('');
  const [contratanteNumero, setContratanteNumero] = useState('');
  const [localEvento, setLocalEvento] = useState('');
  const [contractItems, setContractItems] = useState<any[]>([]);
  const [baseContractValue, setBaseContractValue] = useState(0);

  // Populate fields when editing an existing contract
  useEffect(() => {
    if (editingContrato) {
      setContractTitle(editingContrato.pacoteNome || '');
      setContractClient(editingContrato.contratanteNome || '');
      setContractValue(editingContrato.valorInvestimento?.toString() || '');
      setContractDate(formatDateToISO(editingContrato.dataEvento) || '');
      setContractStatus(editingContrato.status || 'assinado');
      
      setContratanteCidade(editingContrato.contratanteCidade || '');
      setContratanteCpf(editingContrato.contratanteCpf || '');
      setContratanteEndereco(editingContrato.contratanteEndereco || '');
      setContratanteEstado(editingContrato.contratanteEstado || '');
      setContratanteNumero(editingContrato.contratanteNumero || '');
      setLocalEvento(editingContrato.localEvento || '');
      
      const items = editingContrato.pacoteItens || [];
      setContractItems(items);

      const initialItemsTotal = items.reduce((sum, item) => sum + ((item.precoUnitario || 0) * (item.quantidade || 0)), 0);
      const baseVal = (editingContrato.valorInvestimento || 0) - initialItemsTotal;
      setBaseContractValue(baseVal);
    } else {
      // Reset when creating new
      setContractTitle('');
      setContractClient('');
      setContractValue('');
      setContractDate('');
      setContractStatus('assinado');
      setContratanteCidade('');
      setContratanteCpf('');
      setContratanteEndereco('');
      setContratanteEstado('');
      setContratanteNumero('');
      setLocalEvento('');
      setContractItems([]);
      setBaseContractValue(0);
    }
  }, [editingContrato]);
  const [selectedClientOption, setSelectedClientOption] = useState<string>('manual');
  const [selectedPackageOption, setSelectedPackageOption] = useState<string>('manual');

  // CEP API tracking
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [budgetEditingStatus, setBudgetEditingStatus] = useState<any>('proposta_solicitada');

  const [clienteFields, setClienteFields] = useState({
    nomeCompleto: '',
    cpf: '',
    cep: '',
    logradouro: '',
    numeroAddress: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    telefone: '',
    email: ''
  });

  const [eventoFields, setEventoFields] = useState({
    tipo_evento: 'Casamento',
    data_evento: '',
    local_evento: '',
    endereco_evento: '',
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_complemento: '',
    taxa_deslocamento: 0,
    horarioInicio: '18:00'
  });

  const [pacoteFields, setPacoteFields] = useState({
    pacoteId: 'custom',
    pacoteNome: 'Pacote Customizado',
    pacotePreco: 0,
    subtotal: 0,
    taxaDeslocamento: 0,
    valorTotal: 0,
    itens: [] as Array<{ id: string; descricao: string; quantidade: number; precoUnitario: number }>
  });

  // Load clients and packages from Firestore/fallback to use as select dropdown autocompletes
  const loadDatabaseOptions = async () => {
    const db = getFirebaseDb();
    if (db) {
      try {
        const clientSnap = await getDocs(collection(db, 'clientes'));
        const loadedClients: Client[] = [];
        clientSnap.forEach(snap => {
          loadedClients.push({ id: snap.id, ...snap.data() } as Client);
        });
        setAvailClients(loadedClients);
      } catch (e) {
        console.warn("Failed to load clients database for autocomplete, using local client list.");
      }

      try {
        const packageSnap = await getDocs(collection(db, 'pacotes'));
        const loadedPackages: PackageCombo[] = [];
        packageSnap.forEach(snap => {
          loadedPackages.push({ id: snap.id, ...snap.data() } as PackageCombo);
        });
        setAvailPackages(loadedPackages);
      } catch (e) {
        console.warn("Failed to load packages database for autocomplete.");
      }
    }
  };

  // Sync Budgets/Orçamentos and Contratos from Firestore (or LocalStorage fallback)
  useEffect(() => {
    setIsLoading(true);
    const db = getFirebaseDb();
    
    // Offline / Inicial default fallbacks
    const offlineBudgets = loadData<Orcamento>('orcamentos_v2', INITIAL_ORCAMENTOS);
    const offlineContratos = loadData<Contrato>('contratos_v2', INITIAL_CONTRATOS);

    let unsubBudgets: (() => void) | undefined;
    let unsubContracts: (() => void) | undefined;

    if (db) {
      try {
        unsubBudgets = onSnapshot(collection(db, 'orcamentos'), (snapshot) => {
          const list: Orcamento[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({ 
              id: docSnap.id, 
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            } as Orcamento);
          });
          
          if (list.length > 0) {
            setOrcamentos(list);
            localStorage.setItem('als_orcamentos_v2', JSON.stringify(list));
          } else {
            setOrcamentos(offlineBudgets);
          }
          setIsLoading(false);
        }, (err) => {
          console.warn("Firestore connection exception or budgets fetch error:", err);
          setOrcamentos(offlineBudgets);
          setIsLoading(false);
        });

        unsubContracts = onSnapshot(collection(db, 'contratos'), (snapshot) => {
          const list: Contrato[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              ...data
            } as Contrato);
          });

          if (list.length > 0) {
            setContracts(list);
            localStorage.setItem('als_contratos_v2', JSON.stringify(list));
          } else {
            setContracts(offlineContratos);
          }
        }, (err) => {
          console.warn("Firestore contracts connection exception or fetch error:", err);
          setContracts(offlineContratos);
        });

        loadDatabaseOptions();
      } catch (error) {
        console.error("Firestore listeners initialization failure:", error);
        setOrcamentos(offlineBudgets);
        setContracts(offlineContratos);
        setIsLoading(false);
      }
    } else {
      // Offline fallback
      setOrcamentos(offlineBudgets);
      setContracts(offlineContratos);
      setIsLoading(false);
    }

    return () => {
      if (unsubBudgets) unsubBudgets();
      if (unsubContracts) unsubContracts();
    };
  }, []);

  // Autofill client fields when selected from autocomplete
  useEffect(() => {
    if (selectedClientOption && selectedClientOption !== 'manual') {
      const selected = availClients.find(c => c.id === selectedClientOption);
      if (selected) {
        setClienteFields({
          nomeCompleto: selected.nomeCompleto || selected.name || '',
          cpf: selected.cpf || '',
          cep: selected.cep || '',
          logradouro: selected.logradouro || '',
          numeroAddress: selected.numeroAddress || '',
          bairro: selected.bairro || '',
          cidade: selected.cidade || '',
          estado: selected.estado || '',
          complemento: selected.complemento || '',
          telefone: selected.telefone || selected.phone || '',
          email: selected.email || ''
        });
      }
    } else if (selectedClientOption === 'manual') {
      setClienteFields({
        nomeCompleto: '', cpf: '', cep: '', logradouro: '', numeroAddress: '',
        bairro: '', cidade: '', estado: '', complemento: '', telefone: '', email: ''
      });
    }
  }, [selectedClientOption, availClients]);

  // Autofill package fields when selected from autocomplete
  useEffect(() => {
    if (selectedPackageOption && selectedPackageOption !== 'manual') {
      const selected = availPackages.find(p => p.id === selectedPackageOption);
      if (selected) {
        // Map package equipments as initial items
        const initialItens = (selected.equipamentos || []).map((e, index) => ({
          id: `pkg_item_${index}_${Date.now()}`,
          descricao: e.nome,
          quantidade: e.quantidade,
          precoUnitario: e.preco_aluguel_unitario
        }));

        setPacoteFields({
          pacoteId: selected.id,
          pacoteNome: selected.titulo,
          pacotePreco: selected.preco_venda,
          subtotal: selected.preco_venda,
          taxaDeslocamento: parseFloat(eventoFields.taxa_deslocamento as any) || 0,
          valorTotal: selected.preco_venda + (parseFloat(eventoFields.taxa_deslocamento as any) || 0),
          itens: initialItens
        });
      }
    } else if (selectedPackageOption === 'manual') {
      setPacoteFields({
        pacoteId: 'custom',
        pacoteNome: 'Pacote Customizado',
        pacotePreco: 0,
        subtotal: 0,
        taxaDeslocamento: parseFloat(eventoFields.taxa_deslocamento as any) || 0,
        valorTotal: parseFloat(eventoFields.taxa_deslocamento as any) || 0,
        itens: []
      });
    }
  }, [selectedPackageOption, availPackages]);

  // Handle CEP Lookup
  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setClienteFields(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          cep: data.cep || cep
        }));
      }
    } catch (e) {
      console.warn("Failed to lookup CEP:", e);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleEventCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEventoFields(prev => ({
          ...prev,
          endereco_cep: data.cep || cep,
          endereco_rua: data.logradouro || '',
          endereco_bairro: data.bairro || '',
          endereco_cidade: data.localidade || '',
          endereco_estado: data.uf || ''
        }));
      }
    } catch (e) {
      console.warn("Failed to lookup Event CEP:", e);
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Recalculate invoice totals dynamically
  const recalculateInvoiceTotals = (
    basePrice: number, 
    travelFee: number, 
    itemsList: Array<{ id: string; descricao: string; quantidade: number; precoUnitario: number }>
  ) => {
    const itemsSum = itemsList.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
    const sub = basePrice + itemsSum;
    const finalTotal = sub + travelFee;
    return {
      subtotal: sub,
      valorTotal: finalTotal
    };
  };

  // Manage modifications inside the package/pricing items array
  const handleItemFieldChange = (itemId: string, field: 'descricao' | 'quantidade' | 'precoUnitario', val: any) => {
    let updatedItens = pacoteFields.itens.map(item => {
      if (item.id === itemId) {
        const value = field === 'descricao' ? val : parseFloat(val) || 0;
        return { ...item, [field]: value };
      }
      return item;
    });

    const parsedBasePrice = parseFloat(pacoteFields.pacotePreco as any) || 0;
    const parsedFee = parseFloat(eventoFields.taxa_deslocamento as any) || 0;
    const { subtotal, valorTotal } = recalculateInvoiceTotals(parsedBasePrice, parsedFee, updatedItens);

    setPacoteFields(prev => ({
      ...prev,
      itens: updatedItens,
      subtotal,
      valorTotal
    }));
  };

  const handleAddNewItem = () => {
    const newItem = {
      id: 'custom_item_' + Date.now(),
      descricao: '',
      quantidade: 1,
      precoUnitario: 0
    };
    const updatedItens = [...pacoteFields.itens, newItem];
    const parsedBasePrice = parseFloat(pacoteFields.pacotePreco as any) || 0;
    const parsedFee = parseFloat(eventoFields.taxa_deslocamento as any) || 0;
    const { subtotal, valorTotal } = recalculateInvoiceTotals(parsedBasePrice, parsedFee, updatedItens);

    setPacoteFields(prev => ({
      ...prev,
      itens: updatedItens,
      subtotal,
      valorTotal
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItens = pacoteFields.itens.filter(item => item.id !== itemId);
    const parsedBasePrice = parseFloat(pacoteFields.pacotePreco as any) || 0;
    const parsedFee = parseFloat(eventoFields.taxa_deslocamento as any) || 0;
    const { subtotal, valorTotal } = recalculateInvoiceTotals(parsedBasePrice, parsedFee, updatedItens);

    setPacoteFields(prev => ({
      ...prev,
      itens: updatedItens,
      subtotal,
      valorTotal
    }));
  };

  // Update totals whenever base fields (packagePreco or taxa_deslocamento) change
  const handleBasePricingsChange = (basePriceVal: any, feeVal: any) => {
    const baseP = parseFloat(basePriceVal) || 0;
    const feeP = parseFloat(feeVal) || 0;

    const { subtotal, valorTotal } = recalculateInvoiceTotals(baseP, feeP, pacoteFields.itens);

    setEventoFields(prev => ({ ...prev, taxa_deslocamento: feeP }));
    setPacoteFields(prev => ({
      ...prev,
      pacotePreco: baseP,
      taxaDeslocamento: feeP,
      subtotal,
      valorTotal
    }));
  };

  // Create a brand new Budget in Firestore or database fallback
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteFields.nomeCompleto || !clienteFields.email || !eventoFields.data_evento) return;

    const detailedAddress = {
      cep: eventoFields.endereco_cep,
      rua: eventoFields.endereco_rua,
      numero: eventoFields.endereco_numero,
      bairro: eventoFields.endereco_bairro,
      cidade: eventoFields.endereco_cidade,
      estado: eventoFields.endereco_estado,
      complemento: eventoFields.endereco_complemento
    };
    const compiledAddress = compileAddressToString(detailedAddress);

    const newOrcamento: Orcamento = {
      cliente: { ...clienteFields },
      evento: {
        tipo_evento: eventoFields.tipo_evento,
        data_evento: eventoFields.data_evento,
        local_evento: eventoFields.local_evento,
        endereco_evento: compiledAddress,
        endereco_evento_detalhado: detailedAddress as any,
        taxa_deslocamento: eventoFields.taxa_deslocamento,
        taxaDeslocamento: eventoFields.taxa_deslocamento
      },
      pacote: { ...pacoteFields, taxaDeslocamento: eventoFields.taxa_deslocamento },
      dataEvento: eventoFields.data_evento,
      horarioInicio: eventoFields.horarioInicio,
      localEvento: eventoFields.local_evento,
      enderecoEvento: compiledAddress,
      status: 'proposta_solicitada',
      createdAt: new Date().toISOString(),
      versao: 1
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await addDoc(collection(db, 'orcamentos'), newOrcamento);
      } catch (err) {
        console.warn("Error inserting budget to Firestore, falling back locally:", err);
        const updatedList = [{ id: 'orc_' + Date.now(), ...newOrcamento }, ...orcamentos];
        setOrcamentos(updatedList);
        saveData('orcamentos_v2', updatedList);
      }
    } else {
      const updatedList = [{ id: 'orc_' + Date.now(), ...newOrcamento }, ...orcamentos];
      setOrcamentos(updatedList);
      saveData('orcamentos_v2', updatedList);
    }

    // Reset fields
    setSelectedClientOption('manual');
    setSelectedPackageOption('manual');
    setShowAddBudgetModal(false);
  };

  // Budget Detail / Edit modal view controls
  const handleOpenDetailModal = (orc: Orcamento) => {
    setSelectedOrcamento(orc);
    setBudgetEditingStatus(orc.status);
    setClienteFields({ ...orc.cliente });
    const feeValue = orc.evento.taxaDeslocamento ?? orc.evento.taxa_deslocamento ?? orc.pacote?.taxaDeslocamento ?? 0;
    
    const detailed = orc.evento.endereco_evento_detalhado || parseAddressIntoFields(orc.enderecoEvento || orc.evento.endereco_evento || '');
    
    setEventoFields({
      tipo_evento: orc.evento.tipo_evento || 'Casamento',
      data_evento: formatDateToISO(orc.dataEvento || orc.evento.data_evento),
      local_evento: formatLocationOrAddress(orc.localEvento || orc.evento.local_evento || ''),
      endereco_evento: formatLocationOrAddress(orc.enderecoEvento || orc.evento.endereco_evento || ''),
      endereco_cep: detailed.cep || '',
      endereco_rua: detailed.rua || '',
      endereco_numero: detailed.numero || '',
      endereco_bairro: detailed.bairro || '',
      endereco_cidade: detailed.cidade || '',
      endereco_estado: detailed.estado || '',
      endereco_complemento: detailed.complemento || '',
      taxa_deslocamento: feeValue,
      horarioInicio: orc.horarioInicio || '18:00'
    });
    setPacoteFields({
      pacoteId: orc.pacote.pacoteId || 'custom',
      pacoteNome: orc.pacote.pacoteNome || 'Customizado',
      pacotePreco: orc.pacote.pacotePreco || 0,
      subtotal: orc.pacote.subtotal || 0,
      taxaDeslocamento: feeValue,
      valorTotal: orc.pacote.valorTotal || 0,
      itens: orc.pacote.itens || []
    });
    setIsEditingOrcamento(false);
  };

  // State Machine Action: Save Changes ("Salvar Alterações")
  const handleSaveBudgetChanges = async () => {
    if (!selectedOrcamento || !selectedOrcamento.id) return;

    const detailedAddress = {
      cep: eventoFields.endereco_cep,
      rua: eventoFields.endereco_rua,
      numero: eventoFields.endereco_numero,
      bairro: eventoFields.endereco_bairro,
      cidade: eventoFields.endereco_cidade,
      estado: eventoFields.endereco_estado,
      complemento: eventoFields.endereco_complemento
    };
    const compiledAddress = compileAddressToString(detailedAddress);

    const updatedDocument: Orcamento = {
      ...selectedOrcamento,
      status: budgetEditingStatus,
      cliente: { ...clienteFields },
      evento: {
        tipo_evento: eventoFields.tipo_evento,
        data_evento: eventoFields.data_evento,
        local_evento: eventoFields.local_evento,
        endereco_evento: compiledAddress,
        endereco_evento_detalhado: detailedAddress as any,
        taxa_deslocamento: eventoFields.taxa_deslocamento,
        taxaDeslocamento: eventoFields.taxa_deslocamento
      },
      pacote: { ...pacoteFields, taxaDeslocamento: eventoFields.taxa_deslocamento },
      dataEvento: eventoFields.data_evento,
      horarioInicio: eventoFields.horarioInicio,
      localEvento: eventoFields.local_evento,
      enderecoEvento: compiledAddress
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'orcamentos', selectedOrcamento.id), updatedDocument, { merge: true });
        setSelectedOrcamento({ ...updatedDocument });
        setIsEditingOrcamento(false);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `orcamentos/${selectedOrcamento.id}`);
        } catch {
          // Fallback update
          const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...updatedDocument } : o);
          setOrcamentos(updated);
          saveData('orcamentos_v2', updated);
          setSelectedOrcamento({ ...updatedDocument });
          setIsEditingOrcamento(false);
        }
      }
    } else {
      const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...updatedDocument } : o);
      setOrcamentos(updated);
      saveData('orcamentos_v2', updated);
      setSelectedOrcamento({ ...updatedDocument });
      setIsEditingOrcamento(false);
    }
  };

  // State Machine Action: Send Proposal ("Enviar proposta") -> updates status to 'aguardando_aprovacao'
  const handleSendProposal = async () => {
    if (!selectedOrcamento || !selectedOrcamento.id || isSendingProposal) return;

    setIsSendingProposal(true);
    try {
      const detailedAddress = {
        cep: eventoFields.endereco_cep,
        rua: eventoFields.endereco_rua,
        numero: eventoFields.endereco_numero,
        bairro: eventoFields.endereco_bairro,
        cidade: eventoFields.endereco_cidade,
        estado: eventoFields.endereco_estado,
        complemento: eventoFields.endereco_complemento
      };
      const compiledAddress = compileAddressToString(detailedAddress);

      const updatedDocument: Orcamento = {
        ...selectedOrcamento,
        cliente: { ...clienteFields },
        evento: {
          tipo_evento: eventoFields.tipo_evento,
          data_evento: eventoFields.data_evento,
          local_evento: eventoFields.local_evento,
          endereco_evento: compiledAddress,
          endereco_evento_detalhado: detailedAddress as any,
          taxa_deslocamento: eventoFields.taxa_deslocamento,
          taxaDeslocamento: eventoFields.taxa_deslocamento
        },
        pacote: { ...pacoteFields, taxaDeslocamento: eventoFields.taxa_deslocamento },
        dataEvento: eventoFields.data_evento,
        horarioInicio: eventoFields.horarioInicio,
        localEvento: eventoFields.local_evento,
        enderecoEvento: compiledAddress,
        status: 'aguardando_aprovacao' // Update State here
      };

      // Send POST webhook containing budget data and { origem: "enviar_proposta" }
      try {
        await fetch('https://webhook.ehstech.com.br/webhook/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...updatedDocument,
            id: selectedOrcamento.id,
            origem: 'enviar_proposta'
          })
        });
      } catch (webErr) {
        console.error("Erro ao enviar webhook de orçamento:", webErr);
      }

      const db = getFirebaseDb();
      if (db) {
        try {
          await setDoc(doc(db, 'orcamentos', selectedOrcamento.id), updatedDocument, { merge: true });
          setSelectedOrcamento(null);
          setIsEditingOrcamento(false);
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.UPDATE, `orcamentos/${selectedOrcamento.id}`);
          } catch {
            const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...updatedDocument } : o);
            setOrcamentos(updated);
            saveData('orcamentos_v2', updated);
            setSelectedOrcamento(null);
            setIsEditingOrcamento(false);
          }
        }
      } else {
        const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...updatedDocument } : o);
        setOrcamentos(updated);
        saveData('orcamentos_v2', updated);
        setSelectedOrcamento(null);
        setIsEditingOrcamento(false);
      }
    } catch (e) {
      console.error("Erro no fluxo de envio de proposta:", e);
    } finally {
      setIsSendingProposal(false);
    }
  };

  // State Machine Action: Duplicate & Make Version ("Refazer Proposta / Criar Nova Versão")
  const handleRefitProposal = async () => {
    if (!selectedOrcamento || !selectedOrcamento.id) return;

    const doubleCheckedVer = selectedOrcamento.versao ? (selectedOrcamento.versao + 1) : 2;

    const clonedOrcamento: Orcamento = {
      cliente: { ...selectedOrcamento.cliente },
      evento: { ...selectedOrcamento.evento },
      pacote: { ...selectedOrcamento.pacote },
      dataEvento: selectedOrcamento.dataEvento,
      horarioInicio: selectedOrcamento.horarioInicio,
      localEvento: selectedOrcamento.localEvento,
      status: 'proposta_solicitada', // Restart Flow back to pendente
      createdAt: new Date().toISOString(),
      versao: doubleCheckedVer, // Increment Version stamp
      orcamentoOriginalId: selectedOrcamento.id // Track ancestry reference
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        // Create new document in Firebase
        await addDoc(collection(db, 'orcamentos'), clonedOrcamento);
        setSelectedOrcamento(null);
        setIsEditingOrcamento(false);
      } catch (err) {
        const newId = 'orc_' + Date.now();
        const updatedList = [{ id: newId, ...clonedOrcamento }, ...orcamentos];
        setOrcamentos(updatedList);
        saveData('orcamentos_v2', updatedList);
        setSelectedOrcamento(null);
        setIsEditingOrcamento(false);
      }
    } else {
      const newId = 'orc_' + Date.now();
      const updatedList = [{ id: newId, ...clonedOrcamento }, ...orcamentos];
      setOrcamentos(updatedList);
      saveData('orcamentos_v2', updatedList);
      setSelectedOrcamento(null);
      setIsEditingOrcamento(false);
    }
  };

  // Approve proposal manually
  const handleApproveProposal = async () => {
    if (!selectedOrcamento || !selectedOrcamento.id) return;
    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'orcamentos', selectedOrcamento.id), { status: 'aprovado' }, { merge: true });
        setSelectedOrcamento(null);
      } catch (e) {
        const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...o, status: 'aprovado' as const } : o);
        setOrcamentos(updated);
        saveData('orcamentos_v2', updated);
        setSelectedOrcamento(null);
      }
    } else {
      const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...o, status: 'aprovado' as const } : o);
      setOrcamentos(updated);
      saveData('orcamentos_v2', updated);
      setSelectedOrcamento(null);
    }
  };

  // Reject proposal manually
  const handleRejectProposal = async () => {
    if (!selectedOrcamento || !selectedOrcamento.id) return;
    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'orcamentos', selectedOrcamento.id), { status: 'rejeitado' }, { merge: true });
        setSelectedOrcamento(null);
      } catch (e) {
        const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...o, status: 'rejeitado' as const } : o);
        setOrcamentos(updated);
        saveData('orcamentos_v2', updated);
        setSelectedOrcamento(null);
      }
    } else {
      const updated = orcamentos.map(o => o.id === selectedOrcamento.id ? { ...o, status: 'rejeitado' as const } : o);
      setOrcamentos(updated);
      saveData('orcamentos_v2', updated);
      setSelectedOrcamento(null);
    }
  };

  // Trigger Delete Budget Confirmation Modal
  const triggerDeleteBudget = (id: string) => {
    setBudgetToDelete(id);
  };

  // Actual Delete Budget Executer
  const executeDeleteBudget = async () => {
    if (!budgetToDelete) return;
    const id = budgetToDelete;
    const db = getFirebaseDb();
    if (db) {
      try {
        await deleteDoc(doc(db, 'orcamentos', id));
      } catch (err) {
        const updated = orcamentos.filter(o => o.id !== id);
        setOrcamentos(updated);
        saveData('orcamentos_v2', updated);
      }
    } else {
      const updated = orcamentos.filter(o => o.id !== id);
      setOrcamentos(updated);
      saveData('orcamentos_v2', updated);
    }
    if (selectedOrcamento?.id === id) {
      setSelectedOrcamento(null);
    }
    setBudgetToDelete(null);
  };

  // Contract action helper
  const handleContratoStatusChange = async (origin: string, newStatus?: string) => {
    if (!selectedContrato) return;

    const updatedContrato = newStatus 
      ? { ...selectedContrato, status: newStatus as any } 
      : { ...selectedContrato };

    // POST to Webhook
    try {
      await fetch("https://webhook.ehstech.com.br/webhook/contratosarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedContrato, id: selectedContrato.id, origem: origin }),
      });
    } catch (err) {
      console.error("Error sending webhook:", err);
    }

    // Update Local State / Firebase
    if (newStatus) {
      const db = getFirebaseDb();
      if (db) {
        try {
          await setDoc(doc(db, 'contratos', selectedContrato.id), { status: newStatus }, { merge: true });
        } catch(e) { console.error(e); }
      }
      
      const updatedContracts = contracts.map(c => c.id === selectedContrato.id ? updatedContrato : c);
      setContracts(updatedContracts);
      saveData('contratos_v2', updatedContracts);
      setSelectedContrato(updatedContrato);
    }
  };

  const valorPorExtenso = (num: number): string => {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezoito = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (num === 0) return 'zero reais';
    if (num === 100) return 'cem reais';

    const formatarGrupo = (n: number) => {
      let output = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      if (c > 0) {
        output += centenas[c];
      }

      if (d > 0) {
        if (output) output += ' e ';
        if (d === 1) {
          output += dezoito[u];
          return output;
        } else {
          output += dezenas[d];
        }
      }

      if (u > 0) {
        if (output) output += ' e ';
        output += unidades[u];
      }

      return output;
    };

    const inteira = Math.floor(num);
    const centavos = Math.round((num - inteira) * 100);

    let extenso = '';

    if (inteira > 0) {
      if (inteira < 1000) {
        extenso = formatarGrupo(inteira);
      } else if (inteira < 1000000) {
        const milhar = Math.floor(inteira / 1000);
        const resto = inteira % 1000;
        const milharExt = milhar === 1 ? 'mil' : `${formatarGrupo(milhar)} mil`;
        const restoExt = resto > 0 ? `${resto < 100 || resto % 100 === 0 ? ' e ' : ' '}${formatarGrupo(resto)}` : '';
        extenso = milharExt + restoExt;
      } else {
        extenso = `${inteira.toLocaleString('pt-BR')} reais`;
        return extenso;
      }
      extenso += inteira === 1 ? ' real' : ' reais';
    }

    if (centavos > 0) {
      if (extenso) extenso += ' e ';
      if (centavos < 20) {
        if (centavos < 10) extenso += unidades[centavos];
        else extenso += dezoito[centavos - 10];
      } else {
        const d = Math.floor(centavos / 10);
        const u = centavos % 10;
        extenso += dezenas[d] + (u > 0 ? ` e ${unidades[u]}` : '');
      }
      extenso += centavos === 1 ? ' centavo' : ' centavos';
    }

    return extenso;
  };

  // Contract Methods
  const handleAddContractItem = () => {
    const newItem = {
      id: 'custom_item_' + Date.now(),
      descricao: '',
      quantidade: 1,
      precoUnitario: 0
    };
    const updated = [...contractItems, newItem];
    setContractItems(updated);
    recalculateContractTotal(updated);
  };

  const handleRemoveContractItem = (itemId: string) => {
    const updated = contractItems.filter(item => item.id !== itemId);
    setContractItems(updated);
    recalculateContractTotal(updated);
  };

  const handleContractItemFieldChange = (itemId: string, field: string, value: any) => {
    const updated = contractItems.map(item => {
      if (item.id === itemId) {
        let val = value;
        if (field === 'quantidade') {
          val = parseInt(value) || 0;
        } else if (field === 'precoUnitario') {
          val = parseFloat(value) || 0;
        }
        return { ...item, [field]: val };
      }
      return item;
    });
    setContractItems(updated);
    recalculateContractTotal(updated);
  };

  const handleContractValueChange = (valStr: string) => {
    setContractValue(valStr);
    const numericVal = parseFloat(valStr) || 0;
    const itemsTotal = contractItems.reduce((sum, item) => sum + ((item.precoUnitario || 0) * (item.quantidade || 0)), 0);
    setBaseContractValue(numericVal - itemsTotal);
  };

  const recalculateContractTotal = (items: any[]) => {
    const itemsTotal = items.reduce((sum, item) => sum + ((item.precoUnitario || 0) * (item.quantidade || 0)), 0);
    const newTotal = baseContractValue + itemsTotal;
    // Keep 2 decimal places max if floating point
    const roundedTotal = Math.round(newTotal * 100) / 100;
    setContractValue(roundedTotal.toString());
  };

  const handleAddContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractTitle.trim() || !contractClient.trim() || !contractValue || !contractDate) return;

    const valorInvest = parseFloat(contractValue);
    const entrada30 = Math.round(valorInvest * 0.3 * 100) / 100;
    const restante70 = Math.round(valorInvest * 0.7 * 100) / 100;
    const extenso = valorPorExtenso(valorInvest);

    // Ajusta fuso da data para evitar atraso de um dia na exibição local
    const dateParts = contractDate.split('-');
    const dataOriginal = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dateSeconds = Math.floor(dataOriginal.getTime() / 1000);

    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const diaNum = dataOriginal.getDate();
    const mesNome = meses[dataOriginal.getMonth()];
    const anoNum = dataOriginal.getFullYear();
    const dataLegivel = `${diaNum} de ${mesNome} de ${anoNum}`;

    const db = getFirebaseDb();

    if (editingContrato) {
      // UPDATE EXISTING
      const updatedContrato: Contrato = {
        ...editingContrato,
        contratanteNome: contractClient.trim(),
        pacoteNome: contractTitle.trim(),
        valorInvestimento: valorInvest,
        valorEntrada30: entrada30,
        valorRestante70: restante70,
        valorInvestimentoExtenso: extenso,
        dataEvento: { seconds: dateSeconds, nanoseconds: 0 },
        dataAssinatura: dataLegivel,
        dataCriacao: dataLegivel,
        status: contractStatus,
        contratanteCidade,
        contratanteCpf,
        contratanteEndereco,
        contratanteEstado,
        contratanteNumero,
        localEvento,
        pacoteItens: contractItems
      };

      // POST to Webhook
      try {
        await fetch("https://webhook.ehstech.com.br/webhook/contratosarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updatedContrato, id: editingContrato.id, origem: "Ajustar contrato" }),
        });
      } catch (err) {
        console.error("Error sending webhook:", err);
      }

      // Update Local State / Firebase
      if (db) {
        try {
          await setDoc(doc(db, 'contratos', editingContrato.id), updatedContrato, { merge: true });
        } catch(e) { console.error(e); }
      }
      
      const updatedContracts = contracts.map(c => c.id === editingContrato.id ? updatedContrato : c);
      setContracts(updatedContracts);
      saveData('contratos_v2', updatedContracts);
      setSelectedContrato(null); // Ensure it's cleared to avoid overlay confusion

    } else {
      // CREATE NEW
      const newContrato: Contrato = {
        clienteId: 'manual_created',
        contratanteCidade: 'São Paulo',
        contratanteCpf: '000.000.000-00',
        contratanteEndereco: 'Rua do Contratante',
        contratanteEstado: 'SP',
        contratanteNome: contractClient.trim(),
        contratanteNumero: '100',
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        dataAssinatura: dataLegivel,
        dataCriacao: dataLegivel,
        dataEvento: { seconds: dateSeconds, nanoseconds: 0 },
        eventoId: 'manual_event_' + Date.now(),
        listaEquipamentos: [
          { nome: 'Kit Básico de Som e Luz', quantidade: 1 }
        ],
        listaEquipe: [
          { nome: 'Equipe Técnica ALS', funcao: 'Sistemas / Operação' }
        ],
        localEvento: 'Local Especificado no Orçamento',
        pacoteId: 'manual_pkg',
        pacoteItens: [
          { id: 'item_basic_' + Date.now(), descricao: 'Serviço de Sonorização e Iluminação Contratada', precoUnitario: valorInvest, quantidade: 1 }
        ],
        pacoteNome: contractTitle.trim(),
        status: contractStatus || 'assinado',
        valorEntrada30: entrada30,
        valorInvestimento: valorInvest,
        valorInvestimentoExtenso: extenso,
        valorRestante70: restante70
      };

      if (db) {
        try {
          // Pre-generate doc reference to obtain real ID first so we can send it in Webhook
          const docRef = doc(collection(db, 'contratos'));
          const contractId = docRef.id;
          const newContratoWithId: Contrato = {
            ...newContrato,
            id: contractId
          };

          // POST to Webhook with the ID!
          try {
            await fetch("https://webhook.ehstech.com.br/webhook/contratosarm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                ...newContratoWithId, 
                id: contractId, 
                origem: "Adicionar novo contrato" 
              }),
            });
          } catch (err) {
            console.error("Error sending webhook:", err);
          }

          await setDoc(docRef, newContratoWithId);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'contratos');
          const updated = [newContrato, ...contracts];
          setContracts(updated);
          saveData('contratos_v2', updated);
        }
      } else {
        const tempId = 'temp_contract_' + Date.now();
        const newContratoWithId: Contrato = {
          ...newContrato,
          id: tempId
        };

        // POST to Webhook
        try {
          await fetch("https://webhook.ehstech.com.br/webhook/contratosarm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              ...newContratoWithId, 
              id: tempId, 
              origem: "Adicionar novo contrato" 
            }),
          });
        } catch (err) {
          console.error("Error sending webhook:", err);
        }

        const updated = [newContratoWithId, ...contracts];
        setContracts(updated);
        saveData('contratos_v2', updated);
      }
    }

    setContractTitle('');
    setContractClient('');
    setContractValue('');
    setContractDate('');
    setContractStatus('assinado');
    setEditingContrato(null);
    setShowAddContractModal(false);
  };

  // Trigger Delete Contract Confirmation Modal
  const triggerDeleteContract = (id: string) => {
    setContractToDelete(id);
  };

  // Actual Delete Contract Executer
  const executeDeleteContract = async () => {
    if (!contractToDelete) return;
    const id = contractToDelete;
    const db = getFirebaseDb();
    if (db) {
      try {
        await deleteDoc(doc(db, 'contratos', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `contratos/${id}`);
        } catch {
          const updated = contracts.filter(c => c.id !== id);
          setContracts(updated);
          saveData('contratos_v2', updated);
        }
      }
    } else {
      const updated = contracts.filter(c => c.id !== id);
      setContracts(updated);
      saveData('contratos_v2', updated);
    }
    if (selectedContrato?.id === id) {
      setSelectedContrato(null);
    }
    setContractToDelete(null);
  };

  // Update Contract Status
  const handleUpdateContractStatus = async (contractId: string, newStatus: string) => {
    const updated = contracts.map(c => {
      if (c.id === contractId) {
        return { ...c, status: newStatus };
      }
      return c;
    });
    setContracts(updated);
    saveData('contratos_v2', updated);

    // Update state of selectedContrato too
    if (selectedContrato && selectedContrato.id === contractId) {
      setSelectedContrato({ ...selectedContrato, status: newStatus });
    }

    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, 'contratos', contractId), { status: newStatus }, { merge: true });
      } catch (err) {
        console.warn("Firestore status update failed, fallback to local:", err);
      }
    }
  };

  // Perform multi-layered filtering of budgets list (Search query & combined dates)
  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(orc => {
      // 1. Filter by workflow Sub-tab
      const matchesSubTab = 
        (budgetSubTab === 'pending' && orc.status === 'proposta_solicitada') ||
        (budgetSubTab === 'sent' && (orc.status === 'pronto_para_envio' || orc.status === 'aguardando_aprovacao')) ||
        (budgetSubTab === 'finalized' && (orc.status === 'aprovado' || orc.status === 'rejeitado'));
        
      if (!matchesSubTab) return false;

      // 2. Combined filter within 'finalized' (Aprovado vs Rejeitado selector)
      if (budgetSubTab === 'finalized' && finalizedStatusFilter !== 'todas') {
        if (orc.status !== finalizedStatusFilter) return false;
      }

      // 3. Search query parsing (matches Client Full Name or CPF)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clientNameMatch = orc.cliente.nomeCompleto?.toLowerCase().includes(query);
        const clientCpfMatch = orc.cliente.cpf?.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        if (!clientNameMatch && !clientCpfMatch) return false;
      }

      // 4. Combined Date boundaries filtering
      if (startDate) {
        const isoText = formatDateToISO(orc.dataEvento || orc.evento.data_evento);
        if (isoText) {
          const eventD = new Date(isoText);
          const limitS = new Date(startDate);
          if (eventD < limitS) return false;
        }
      }
      if (endDate) {
        const isoText = formatDateToISO(orc.dataEvento || orc.evento.data_evento);
        if (isoText) {
          const eventD = new Date(isoText);
          const limitE = new Date(endDate);
          if (eventD > limitE) return false;
        }
      }

      return true;
    });
  }, [orcamentos, budgetSubTab, finalizedStatusFilter, searchQuery, startDate, endDate]);

  // Perform multi-layered filtering of contracts list (Search query & combined dates)
  const filteredContratos = useMemo(() => {
    return contracts.filter(con => {
      // 1. Search query parsing (matches contratanteNome, pacoteNome, contratanteCidade, contratanteCpf, etc.)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clientNameMatch = con.contratanteNome?.toLowerCase().includes(query);
        const packetNameMatch = con.pacoteNome?.toLowerCase().includes(query);
        const cityMatch = con.contratanteCidade?.toLowerCase().includes(query);
        const clientCpfMatch = con.contratanteCpf?.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        if (!clientNameMatch && !clientCpfMatch && !packetNameMatch && !cityMatch) return false;
      }

      // 2. Combined Date boundaries filtering
      if (startDate || endDate) {
        const isoText = formatDateToISO(con.dataEvento);
        if (isoText) {
          const eventD = new Date(isoText);
          if (startDate) {
            const limitS = new Date(startDate);
            if (eventD < limitS) return false;
          }
          if (endDate) {
            const limitE = new Date(endDate);
            if (eventD > limitE) return false;
          }
        }
      }

      // 3. Status filter
      if (contratoStatusFilter !== 'todos') {
        const statusLower = con.status?.toLowerCase().trim() || 'assinado';
        const filterLower = contratoStatusFilter.toLowerCase().trim();
        if (statusLower !== filterLower) {
          return false;
        }
      }

      return true;
    });
  }, [contracts, searchQuery, startDate, endDate, contratoStatusFilter]);

  const hasActiveFilters = searchQuery !== '' || startDate !== '' || endDate !== '' || finalizedStatusFilter !== 'todas';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setFinalizedStatusFilter('todas');
  };

  const hasActiveFiltersContracts = searchQuery !== '' || startDate !== '' || endDate !== '' || contratoStatusFilter !== 'todos';

  const handleClearFiltersContracts = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setContratoStatusFilter('todos');
  };

  if (selectedContrato) {
    return (
      <div className="relative bg-white font-sans text-gray-900 pb-20">
        {/* Close Button subtle 'X' on top right (relative to the container) */}
        <button
          onClick={() => setSelectedContrato(null)}
          className="absolute top-4 right-4 z-40 p-2 text-gray-400 hover:text-gray-900 transition-colors"
          aria-label="Voltar aos Contratos"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="max-w-4xl mx-auto py-12 px-6 sm:px-10">
          {/* Logo and Business Info centered */}
          <div className="flex flex-col items-center mb-16 space-y-4">
            <img
              src="https://res.cloudinary.com/dnatvwcxy/image/upload/v1779998284/Captura_de_tela_2026-05-28_161912_onpjzm.png"
              alt="Logo ARM"
              className="h-24 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-center text-xs text-gray-700">
              <p className="font-bold">{company.razaoSocial}</p>
              <p>CNPJ: {company.cnpj}</p>
              <p>IE: 649099869117</p>
              <p>{company.endereco}</p>
            </div>
            <p className="font-bold uppercase mt-2 text-sm text-center">
              CONTRATO DE LOCAÇÃO E PRESTAÇÃO DE SERVIÇOS DE SONORIZAÇÃO
            </p>
          </div>

          {/* Minimalist contract display area - Clause I and Clause II */}
          <div className="text-justify font-sans text-xs text-gray-900 leading-relaxed max-w-2xl mx-auto mt-10 space-y-6">
            <p>
              <span className="font-bold text-red-900">CLÁUSULA I:</span> Pelo presente instrumento particular de Contrato de Locação e Prestação de Serviços de Sonorização, as partes abaixo assinadas, de um lado a {company.razaoSocial}, representado pelo Sr. Artur Ramires Marchetto, portador do RG 44812876-7 e do CPF 371638598-05, residente na {company.endereco}, aqui denominado simplesmente como CONTRATADO.
              <br /><br />
              Do outro lado, {selectedContrato.contratanteNome}, portador(a) do CPF no {selectedContrato.contratanteCpf}, residente na {selectedContrato.contratanteEndereco}, {selectedContrato.contratanteNumero}, {selectedContrato.contratanteCidade}-{selectedContrato.contratanteEstado}, responsável pela locação, aqui denominado(a) simplesmente como CONTRATANTE, tem entre si justo e contratado o que mutuamente aceitam e outorgam:
            </p>
            <p>
              <span className="font-bold text-red-900">CLÁUSULA II:</span> Pela locação e prestação dos serviços de sonorização, as partes ajustam e ratificam o valor de {selectedContrato.valorInvestimento?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({selectedContrato.valorInvestimentoExtenso}), sendo que a liquidação do custo deverá ser feita em duas parcelas: 1ª parcela de {selectedContrato.valorEntrada30?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} na entrada e a 2ª parcela de {selectedContrato.valorRestante70?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} até três dias antes do evento.
            </p>
            <p>
              <span className="font-bold text-red-900">CLÁUSULA III:</span> O CONTRATANTE deverá pagar a 1ª parcela referente à entrada, descrita na Cláusula II, na assinatura deste contrato. O não comprimento desta Cláusula excederá em cancelamento total do contrato cedendo desta forma ao CONTRATANTE o direito de disponibilizar a data do evento para outros interessados.
            </p>
            <p>
              <span className="font-bold text-red-900">CLÁUSULA IV:</span> O CONTRATADO assume a responsabilidade de seu comparecimento para a locação dos equipamentos sonoros para a prestação dos serviços de sonorização na seguinte data, horário e local abaixo discriminado:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-4 font-sans text-xs text-blue-800 space-y-1">
              <p><strong>Data:</strong> {formatDateToBR(selectedContrato.dataEvento || selectedContrato.evento?.data_evento)}</p>
              <p><strong>Duração:</strong> 6 horas a partir do início da festa.</p>
              <p><strong>Local do evento:</strong> {selectedContrato.localEvento || selectedContrato.evento?.local_evento}.</p>
              <p><strong>OBS:</strong> Após o horário do contrato será cobrado R$800,00 por hora.</p>
            </div>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA V:</span> Independente do valor estipulado na Cláusula II correrá por conta exclusiva do CONTRATANTE, a despesa:
              <br/>
              A) A alimentação de 4 profissionais durante a realização do evento.
            </p>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA VI:</span> O CONTRATANTE reservará gratuitamente para o dia do evento, um espaço para montagem dos equipamentos de som.
            </p>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA VII:</span> Todo o equipamento de som fica a cargo do CONTRATADO, ficando certo que para o cumprimento perfeito deste item, o CONTRATANTE deverá atender às seguintes especificações:
              <br/>
              a) Deverão ter numa distância de 10 metros do palco, no mínimo uma tomada monofásica perfeitamente instalada, com voltagem de 220 W, ou quadro trifásico.
              <br/>
              b) O palco deverá estar totalmente desimpedido e liberado assim que a equipe técnica chegar ao local do evento.
            </p>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA VIII:</span> O contratado fica responsável em fornecer os seguintes equipamentos:
            </p>

            {(() => {
              const pkg = availPackages.find(p => p.id === selectedContrato.pacoteId);
              if (!pkg) return null;
              return (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6 mt-6">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      <Package className="h-5 w-5 text-red-900" />
                      {pkg.titulo || pkg.nome}
                    </h3>
                  </div>

                  {pkg.equipamentos && pkg.equipamentos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-red-900 uppercase tracking-wider flex items-center gap-2">
                        <Volume2 className="h-3 w-3" />
                        Estruturas
                      </h4>
                      <ul className="text-sm text-gray-600 list-none pl-1 space-y-1">
                       {pkg.equipamentos.map((eq: any, i: number) => (
                         <li key={i} className="flex items-center gap-2">
                           <CheckCircle className="h-3 w-3 text-red-900" /> 
                           {eq.quantidade}x {eq.nome}
                         </li>
                       ))}
                      </ul>
                    </div>
                  )}

                  {pkg.equipe_tecnica && pkg.equipe_tecnica.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-red-900 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Equipe Técnica
                      </h4>
                      <ul className="text-sm text-gray-600 list-none pl-1 space-y-1">
                       {pkg.equipe_tecnica.map((te: any, i: number) => (
                         <li key={i} className="flex items-center gap-2">
                           <CheckCircle className="h-3 w-3 text-red-900" />
                           {te.quantidade} {te.funcao}
                         </li>
                       ))}
                      </ul>
                    </div>
                  )}

                  {selectedContrato.pacoteItens && selectedContrato.pacoteItens.length > 0 && (
                     <div className="space-y-2">
                      <h4 className="font-bold text-xs text-red-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        Adicionais
                      </h4>
                      <ul className="text-sm text-gray-600 list-none pl-1 space-y-1">
                       {selectedContrato.pacoteItens.map((item: any, i: number) => (
                         <li key={i} className="flex items-center gap-2">
                           <CheckCircle className="h-3 w-3 text-red-900" />
                           {item.nome || item.descricao}
                         </li>
                       ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            <p>
              <span className="font-bold text-red-900">CLÁUSULA IX:</span> Em caso de rescisão deste contrato, à parte que o fizer incidirá na multa de 50% do valor total do mesmo se a rescisão ocorrer 30 dias antes da data aprazada e, incorrerá na multa integral, se a mesma se verificar em prazo menor.
            </p>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA X:</span> O Contratante autoriza o Contratado a realizar atividades de Marketing durante o evento.
            </p>

            <p>
              <span className="font-bold text-red-900">CLÁUSULA XI:</span> Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de São Manuel-SP.
            </p>
            <p className="text-justify italic text-gray-700">
              Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor, juntamente com duas testemunhas.
            </p>

            <div className="mt-12 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-100 p-8 flex flex-col items-center justify-center space-y-2">
              <span className="font-sans font-bold text-xs text-red-900 uppercase tracking-widest">CONTRATADO</span>
              <img 
                src="https://res.cloudinary.com/dnatvwcxy/image/upload/v1779998264/assinaturaarm_xiunmy.png" 
                alt="Assinatura" 
                className="h-16 w-auto opacity-90 my-2" 
              />
              <span className="font-sans font-bold text-black text-lg">ARM Som e Luz</span>
              <span className="font-sans text-xs text-gray-500">{company.cnpj}</span>
              <span className="font-sans italic text-[10px] text-gray-400">assinado digitalmente</span>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                disabled={selectedContrato?.status === 'assinado' || selectedContrato?.status === 'cancelado'}
                onClick={() => {
                  if (selectedContrato) {
                    setEditingContrato(selectedContrato);
                    setSelectedContrato(null);
                    setShowAddContractModal(true);
                  }
                }}
                className={`w-full py-3 font-bold rounded-xl text-sm transition-all ${
                  selectedContrato?.status === 'assinado' || selectedContrato?.status === 'cancelado'
                    ? "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-60"
                    : "bg-secondary hover:bg-secondary-dark text-white"
                }`}
              >
                Ajustar contrato
              </button>
              <button 
                disabled={selectedContrato?.status === 'cancelado' || selectedContrato?.status === 'assinado'}
                onClick={() => handleContratoStatusChange(
                  selectedContrato?.status === 'aguardando_assinatura' ? "Validado" : "Validar", 
                  "aguardando_assinatura"
                )}
                className={`w-full py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedContrato?.status === 'cancelado' || selectedContrato?.status === 'assinado'
                    ? "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-60"
                    : selectedContrato?.status === 'aguardando_assinatura'
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-secondary hover:bg-secondary-dark text-white"
                }`}
              >
                {selectedContrato?.status === 'aguardando_assinatura' ? (
                  <>
                    <Check className="h-4 w-4 stroke-[3px]" />
                    Validado
                  </>
                ) : (
                  "Validar"
                )}
              </button>
              <button 
                disabled={selectedContrato?.status === 'cancelado' || selectedContrato?.status === 'assinado'}
                onClick={() => handleContratoStatusChange("Cancelar contrato", "cancelado")}
                className={`w-full py-3 font-bold rounded-xl text-sm transition-all ${
                  selectedContrato?.status === 'cancelado' || selectedContrato?.status === 'assinado'
                    ? "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-60"
                    : "bg-secondary hover:bg-secondary-dark text-white"
                }`}
              >
                {selectedContrato?.status === 'cancelado' 
                  ? "Contrato Cancelado" 
                  : selectedContrato?.status === 'assinado'
                    ? "Contrato Assinado"
                    : "Cancelar contrato"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pb-20">
      {/* Top Title Workspace */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">Documentação Técnica</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Canalizador e controle de orçamentos e contratos</p>
        </div>
      </div>

      {/* Main Mode Tabs Switch */}
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-zinc-800/80">
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'orcamento'
              ? 'bg-white text-gray-950 shadow-xs dark:bg-zinc-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Orçamentos
        </button>
        <button
          onClick={() => setActiveTab('contrato')}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'contrato'
              ? 'bg-white text-gray-950 shadow-xs dark:bg-zinc-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Contratos
        </button>
      </div>

      {/* RENDER BUDGET WORKSPACE */}
      {activeTab === 'orcamento' && (
        <div className="space-y-4">
          
          {/* Sub-Tabs Separatist for Budgets (Pendentes, Enviados, Finalizados) */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-50 p-1 dark:bg-zinc-950/40 border border-gray-150/50 dark:border-zinc-850">
            <button
              onClick={() => { setBudgetSubTab('pending'); handleClearFilters(); }}
              className={`rounded-lg py-2 text-center text-[11px] font-extrabold transition-all outline-none flex items-center justify-center gap-1.5 ${
                budgetSubTab === 'pending'
                  ? 'bg-primary/10 text-primary border-primary/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Clock className="h-3 w-3" />
              Pendentes
            </button>
            <button
              onClick={() => { setBudgetSubTab('sent'); handleClearFilters(); }}
              className={`rounded-lg py-2 text-center text-[11px] font-extrabold transition-all outline-none flex items-center justify-center gap-1.5 ${
                budgetSubTab === 'sent'
                  ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Send className="h-3 w-3" />
              Enviados
            </button>
            <button
              onClick={() => { setBudgetSubTab('finalized'); handleClearFilters(); }}
              className={`rounded-lg py-2 text-center text-[11px] font-extrabold transition-all outline-none flex items-center justify-center gap-1.5 ${
                budgetSubTab === 'finalized'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <CheckCircle className="h-3 w-3" />
              Finalizados
            </button>
          </div>

          {/* Combined Filters Panel */}
          <div className="rounded-2xl border border-gray-150 bg-white p-3.5 shadow-sm dark:border-zinc-850 dark:bg-zinc-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              
              {/* Quick Search client/CPF */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar pelo nome do cliente ou CPF..."
                  className="w-full rounded-xl border border-gray-100 bg-gray-50/50 py-2 pl-9 pr-4 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:focus:border-primary dark:focus:bg-zinc-900"
                />
              </div>

              {/* Date Filters Inputs */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-2 text-[10px] sm:text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:focus:border-primary"
                  title="Data de execução inicial"
                  placeholder="Início"
                />
                <span className="text-[10px] text-gray-400 font-bold">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-2 text-[10px] sm:text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:focus:border-primary"
                  title="Data de execução final"
                  placeholder="Fim"
                />
              </div>
            </div>

            {/* If Finalized Tab is active, show the sub-status filter (Aprovado / Rejeitado) */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100/50 dark:border-zinc-800/40">
              <div className="flex items-center gap-1">
                {budgetSubTab === 'finalized' && (
                  <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-950/50">
                    <button
                      onClick={() => setFinalizedStatusFilter('todas')}
                      className={`rounded px-2.5 py-1 text-[10px] font-extrabold ${finalizedStatusFilter === 'todas' ? 'bg-white text-gray-900 shadow-xs dark:bg-zinc-900 dark:text-white' : 'text-gray-400 hover:text-gray-800 dark:text-zinc-500'}`}
                    >
                      Todos Finalizados
                    </button>
                    <button
                      onClick={() => setFinalizedStatusFilter('aprovado')}
                      className={`rounded px-2.5 py-1 text-[10px] font-extrabold ${finalizedStatusFilter === 'aprovado' ? 'bg-green-500 text-white shadow-xs' : 'text-gray-400 hover:text-green-500 dark:text-zinc-500'}`}
                    >
                      Aprovados
                    </button>
                    <button
                      onClick={() => setFinalizedStatusFilter('rejeitado')}
                      className={`rounded px-2.5 py-1 text-[10px] font-extrabold ${finalizedStatusFilter === 'rejeitado' ? 'bg-red-500 text-white shadow-xs' : 'text-gray-400 hover:text-red-500 dark:text-zinc-500'}`}
                    >
                      Rejeitados
                    </button>
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 hover:underline ml-auto"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* BUDBETS LIST */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                <p className="text-xs">Sincronizando com Firestore corporativo...</p>
              </div>
            ) : filteredOrcamentos.length > 0 ? (
              filteredOrcamentos.map((orc, index) => {
                const isCloned = orc.orcamentoOriginalId ? true : false;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    key={orc.id || index}
                    onClick={() => handleOpenDetailModal(orc)}
                    className="group relative flex items-center justify-between rounded-3xl border border-gray-150 bg-white p-4.5 shadow-xs hover:shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 cursor-pointer hover:border-gray-300 dark:hover:border-zinc-700/80 transition-all"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status badge color keys */}
                        {orc.status === 'proposta_solicitada' && (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-500/20">
                            PENDENTE DE ANÁLISE
                          </span>
                        )}
                        {(orc.status === 'pronto_para_envio' || orc.status === 'aguardando_aprovacao') && (
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-500/20">
                            ENVIADO / AGUARDANDO
                          </span>
                        )}
                        {orc.status === 'aprovado' && (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-black text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-500/20">
                            APROVADO
                          </span>
                        )}
                        {orc.status === 'rejeitado' && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-500/20">
                            REJEITADO
                          </span>
                        )}

                        {/* Version Stamp with layered history track */}
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-mono font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-350">
                          v{orc.versao || 1}
                        </span>

                        {isCloned && (
                          <span className="inline-flex items-center rounded-md bg-blue-50/50 px-1.5 py-0.5 text-[8px] font-bold text-blue-600 dark:bg-blue-950/10 dark:text-blue-400">
                            Re-orçado
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight mt-1">
                        {orc.cliente.nomeCompleto}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-gray-400" />
                          {orc.evento.tipo_evento}
                        </span>
                        <span className="flex items-center gap-1 font-mono font-bold">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatDateToBR(orc.dataEvento || orc.evento.data_evento)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {formatLocationOrAddress(orc.localEvento || orc.evento.local_evento) || 'Local não especificado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                      <span className="font-mono text-sm font-black text-secondary">
                        {orc.pacote.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 font-bold">
                        Visualizar
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-20 text-center text-gray-400 dark:text-zinc-500 border-2 border-dashed border-gray-100 dark:border-zinc-850 rounded-3xl">
                <FileText className="mx-auto h-9 w-9 opacity-35 mb-3 text-gray-400" />
                <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">Nenhum orçamento encontrado</p>
                <p className="text-xs px-6 max-w-sm mx-auto mt-1">
                  Não localizamos registros para o filtro selecionado nesta aba. Toque no botão flutuante "+" para registrar um.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 rounded-xl border border-gray-150 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850"
                  >
                    Resetar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER CONTRACTS WORKSPACE */}
      {activeTab === 'contrato' && (
        <div className="space-y-4">
          
          {/* Sub-Tabs Selector for Contracts */}
          <div className="grid grid-cols-5 gap-1 rounded-xl bg-gray-50 p-1 dark:bg-zinc-950/40 border border-gray-150/50 dark:border-zinc-850">
            <button
              onClick={() => { setContratoStatusFilter('todos'); }}
              className={`rounded-lg py-2 text-center text-[10px] font-extrabold transition-all outline-none flex items-center justify-center gap-1 sm:gap-1.5 ${
                contratoStatusFilter === 'todos'
                  ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-800'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setContratoStatusFilter('em análise'); }}
              className={`rounded-lg py-2 text-center text-[10px] font-extrabold transition-all outline-none flex items-center justify-center gap-1 sm:gap-1.5 ${
                contratoStatusFilter === 'em análise'
                  ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500'
              }`}
            >
              <Clock className="h-3 w-3 shrink-0 hidden sm:inline" />
              Análise
            </button>
            <button
              onClick={() => { setContratoStatusFilter('aguardando assinatura'); }}
              className={`rounded-lg py-2 text-center text-[10px] font-extrabold transition-all outline-none flex items-center justify-center gap-1 sm:gap-1.5 ${
                contratoStatusFilter === 'aguardando assinatura'
                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500'
              }`}
            >
              <Send className="h-3 w-3 shrink-0 hidden sm:inline" />
              Espera
            </button>
            <button
              onClick={() => { setContratoStatusFilter('assinado'); }}
              className={`rounded-lg py-2 text-center text-[10px] font-extrabold transition-all outline-none flex items-center justify-center gap-1 sm:gap-1.5 ${
                contratoStatusFilter === 'assinado'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500'
              }`}
            >
              <CheckCircle className="h-3 w-3 shrink-0 hidden sm:inline" />
              Assinado
            </button>
            <button
              onClick={() => { setContratoStatusFilter('cancelado'); }}
              className={`rounded-lg py-2 text-center text-[10px] font-extrabold transition-all outline-none flex items-center justify-center gap-1 sm:gap-1.5 ${
                contratoStatusFilter === 'cancelado'
                  ? 'bg-red-500/10 text-red-500 border-red-500/20 border'
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500'
              }`}
            >
              Cancelado
            </button>
          </div>

          {/* Combined Filters Panel for Contracts */}
          <div className="rounded-2xl border border-gray-150 bg-white p-3.5 shadow-sm dark:border-zinc-850 dark:bg-zinc-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              
              {/* Quick Search client/CPF/Packet */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar pelo nome do contratante, pacote ou local..."
                  className="w-full rounded-xl border border-gray-100 bg-gray-50/50 py-2 pl-9 pr-4 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                />
              </div>

              {/* Date Filters Inputs */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-2 text-[10px] sm:text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                  title="Data de execução inicial"
                  placeholder="Início"
                />
                <span className="text-[10px] text-gray-400 font-bold">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-2 text-[10px] sm:text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                  title="Data de execução final"
                  placeholder="Fim"
                />
              </div>
            </div>

            {hasActiveFiltersContracts && (
              <div className="flex items-center justify-end pt-1 border-t border-gray-100/50 dark:border-zinc-800/40">
                <button
                  onClick={handleClearFiltersContracts}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 hover:underline ml-auto"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredContratos.length > 0 ? (
              filteredContratos.map((docItem, index) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={docItem.id}
                  onClick={() => setSelectedContrato(docItem)}
                  className="group relative flex items-center justify-between rounded-2xl border border-gray-150 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 hover:border-zinc-500/30 transition-all cursor-pointer"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                      {docItem.pacoteNome || 'Contrato de Prestação de Serviços'}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-gray-450" />
                        {docItem.contratanteNome}
                      </span>
                      <span className="flex items-center gap-1 font-mono font-bold">
                        <Calendar className="h-3.5 w-3.5 text-gray-450" />
                        {formatDateToBR(docItem.dataEvento)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-450" />
                        {docItem.localEvento || `${docItem.contratanteCidade}/${docItem.contratanteEstado}`}
                      </span>
                      {(() => {
                        const s = (docItem.status || 'assinado').toLowerCase().trim();
                        if (s === 'em análise') {
                          return (
                            <span className="inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-950/20 px-2 py-0.5 text-[8.5px] font-black text-yellow-750 dark:text-yellow-400 ring-1 ring-inset ring-yellow-650/15 uppercase">
                              Em Análise
                            </span>
                          );
                        } else if (s === 'aguardando assinatura') {
                          return (
                            <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 text-[8.5px] font-black text-orange-650 dark:text-orange-450 ring-1 ring-inset ring-orange-500/15 uppercase">
                              Aguardando Assinatura
                            </span>
                          );
                        } else if (s === 'cancelado') {
                          return (
                            <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950/20 px-2 py-0.5 text-[8.5px] font-black text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/15 uppercase">
                              Cancelado
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/15 uppercase">
                              Assinado
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-mono text-sm font-black text-zinc-800 dark:text-zinc-200 animate-pulse-subtle">
                      {docItem.valorInvestimento?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDeleteContract(docItem.id!);
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      title="Excluir Contrato"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-400 dark:text-zinc-500 border-2 border-dashed border-gray-100 dark:border-zinc-850 rounded-3xl">
                <FileText className="mx-auto h-9 w-9 opacity-35 mb-3 text-gray-400" />
                <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">Nenhum contrato encontrado</p>
                <p className="text-xs px-6 max-w-sm mx-auto mt-1">
                  Não localizamos contratos oficiais para o termo de pesquisa selecionado. Toque no botão flutuante "+" para registrar um.
                </p>
                {hasActiveFiltersContracts && (
                  <button
                    onClick={handleClearFiltersContracts}
                    className="mt-4 rounded-xl border border-gray-150 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850"
                  >
                    Resetar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WIZARD DIALOG: NEW BUDGET / ORÇAMENTO */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-3xl border border-gray-150 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 my-8 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/20">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Criar Novo Orçamento</h3>
                  <p className="text-[10px] text-gray-400 font-bold">Fluxo v1 • Entrada de Proposta</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBudgetModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Form body */}
            <form onSubmit={handleCreateBudget} className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* SECTION 1: CLIENT DATA SECO */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  1. Dados do Cliente Solicitante
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select client autocomplete dropdown optionally */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Aproveitar Cadastro Existente?</label>
                    <select
                      value={selectedClientOption}
                      onChange={(e) => setSelectedClientOption(e.target.value)}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:focus:border-primary"
                    >
                      <option value="manual">-- Preencher Manualmente --</option>
                      {availClients.map(c => (
                        <option key={c.id} value={c.id}>{c.nomeCompleto || c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={clienteFields.nomeCompleto}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                      placeholder="Ex: Carlos Eduardo Silveira"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">CPF</label>
                    <input
                      type="text"
                      value={clienteFields.cpf}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Telefone</label>
                    <input
                      type="text"
                      value={clienteFields.telefone}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={clienteFields.email}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="carlossed@exemplo.com"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>
                </div>

                {/* Address Subsections */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase flex items-center justify-between">
                      CEP {isSearchingCep && <LoaderIcon />}
                    </label>
                    <input
                      type="text"
                      value={clienteFields.cep}
                      onChange={(e) => {
                        setClienteFields(prev => ({ ...prev, cep: e.target.value }));
                        if (e.target.value.replace(/\D/g, '').length === 8) {
                          handleCepLookup(e.target.value);
                        }
                      }}
                      placeholder="89010-000"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Logradouro</label>
                    <input
                      type="text"
                      value={clienteFields.logradouro}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, logradouro: e.target.value }))}
                      placeholder="Ex: Alamedas das Flores"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Número</label>
                    <input
                      type="text"
                      value={clienteFields.numeroAddress}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, numeroAddress: e.target.value }))}
                      placeholder="Ex: 50A"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Bairro</label>
                    <input
                      type="text"
                      value={clienteFields.bairro}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, bairro: e.target.value }))}
                      placeholder="Ex: Centro"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Cidade</label>
                    <input
                      type="text"
                      value={clienteFields.cidade}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Blumenau"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Estado</label>
                    <input
                      type="text"
                      value={clienteFields.estado}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, estado: e.target.value }))}
                      placeholder="SC"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Complemento</label>
                    <input
                      type="text"
                      value={clienteFields.complemento}
                      onChange={(e) => setClienteFields(prev => ({ ...prev, complemento: e.target.value }))}
                      placeholder="Ex: Bloco B"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: EVENT DETAILS */}
              <div className="space-y-3.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <h4 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  2. Logística & Detalhes do Evento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Tipo de Evento</label>
                    <select
                      value={eventoFields.tipo_evento}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, tipo_evento: e.target.value }))}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <option value="Casamento">Casamento</option>
                      <option value="Formatura">Formatura</option>
                      <option value="Corporativo">Corporativo / Executivo</option>
                      <option value="Aniversário">Aniversário</option>
                      <option value="Show / Festival">Show / Festival</option>
                      <option value="Outro">Outro Customizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Data do Evento *</label>
                    <input
                      type="date"
                      required
                      value={eventoFields.data_evento}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, data_evento: e.target.value }))}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Local Físico / Nome do Espaço</label>
                    <input
                      type="text"
                      value={eventoFields.local_evento}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, local_evento: e.target.value }))}
                      placeholder="Ex: Buffet Colonial Sul, Sítio Primavera"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase flex items-center justify-between">
                      CEP Evento {isSearchingCep && <span className="animate-spin text-[8px]">●</span>}
                    </label>
                    <input
                      type="text"
                      value={eventoFields.endereco_cep}
                      onChange={(e) => {
                        setEventoFields(prev => ({ ...prev, endereco_cep: e.target.value }));
                        if (e.target.value.replace(/\D/g, '').length === 8) {
                          handleEventCepLookup(e.target.value);
                        }
                      }}
                      placeholder="Ex: 01311-200"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_rua}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_rua: e.target.value }))}
                      placeholder="Ex: Av. Paulista"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Número</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_numero}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_numero: e.target.value }))}
                      placeholder="Ex: 1000"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Bairro</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_bairro}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_bairro: e.target.value }))}
                      placeholder="Ex: Bela Vista"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Cidade</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_cidade}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_cidade: e.target.value }))}
                      placeholder="Ex: São Paulo"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Estado</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_estado}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_estado: e.target.value }))}
                      placeholder="Ex: SP"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Complemento</label>
                    <input
                      type="text"
                      value={eventoFields.endereco_complemento}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_complemento: e.target.value }))}
                      placeholder="Ex: Bloco C, AP 22"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Início do Evento</label>
                    <input
                      type="time"
                      value={eventoFields.horarioInicio}
                      onChange={(e) => setEventoFields(prev => ({ ...prev, horarioInicio: e.target.value }))}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Taxa Deslocamento (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={eventoFields.taxa_deslocamento}
                      onChange={(e) => handleBasePricingsChange(pacoteFields.pacotePreco, e.target.value)}
                      placeholder="Ex: 150"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950/40 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PACKAGE AND ITEMS LIST */}
              <div className="space-y-3.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                    3. Detalhamento Técnico e Financeiro
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="text-[10px] bg-zinc-100 text-zinc-700 font-extrabold hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 px-2 py-1 rounded-lg transition-all"
                  >
                    + Adicionar Equipamento / Item
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Selecionar Pacote Combo?</label>
                    <select
                      value={selectedPackageOption}
                      onChange={(e) => setSelectedPackageOption(e.target.value)}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800"
                    >
                      <option value="manual">-- Customizado / Sem Pacote --</option>
                      {availPackages.map(p => (
                        <option key={p.id} value={p.id}>{p.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Nome do Pacote</label>
                    <input
                      type="text"
                      value={pacoteFields.pacoteNome}
                      onChange={(e) => setPacoteFields(prev => ({ ...prev, pacoteNome: e.target.value }))}
                      placeholder="Ex: Customizado Premium"
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none focus:border-primary dark:border-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Preço Base do Pacote (R$)</label>
                    <input
                      type="number"
                      value={pacoteFields.pacotePreco}
                      onChange={(e) => handleBasePricingsChange(e.target.value, eventoFields.taxa_deslocamento)}
                      className="w-full rounded-xl border border-gray-150 bg-gray-50/50 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Items detail list */}
                {pacoteFields.itens.length > 0 ? (
                  <div className="border border-gray-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden text-xs">
                    <div className="bg-gray-50/80 dark:bg-zinc-950/20 p-2 text-[10px] uppercase font-bold grid grid-cols-12 gap-2 text-gray-400 border-b border-gray-100 dark:border-zinc-800">
                      <div className="col-span-6">Equipamento / Serviço</div>
                      <div className="col-span-2 text-center">Quant.</div>
                      <div className="col-span-3 text-right">Unitário (R$)</div>
                      <div className="col-span-1"></div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-zinc-800/60 max-h-48 overflow-y-auto">
                      {pacoteFields.itens.map(item => (
                        <div key={item.id} className="p-2 grid grid-cols-12 gap-2 items-center bg-white dark:bg-zinc-900">
                          <div className="col-span-6">
                            <input
                              type="text"
                              required
                              value={item.descricao}
                              onChange={(e) => handleItemFieldChange(item.id, 'descricao', e.target.value)}
                              placeholder="Ex: Refletor LED RGB"
                              className="w-full bg-transparent border-b border-dashed border-gray-200 outline-none p-0.5 text-xs focus:border-primary dark:border-zinc-800"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantidade}
                              onChange={(e) => handleItemFieldChange(item.id, 'quantidade', e.target.value)}
                              className="w-full bg-transparent text-center border-b border-dashed border-gray-200 outline-none p-0.5 focus:border-primary dark:border-zinc-800"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              required
                              value={item.precoUnitario}
                              onChange={(e) => handleItemFieldChange(item.id, 'precoUnitario', e.target.value)}
                              className="w-full bg-transparent text-right border-b border-dashed border-gray-200 outline-none p-0.5 focus:border-primary dark:border-zinc-800"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-650"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs bg-gray-50/40 rounded-2xl dark:bg-zinc-950/20">
                    Nenhum item avulso adicionado ao pacote. Custo derivado apenas do preço base.
                  </div>
                )}
              </div>

              {/* FOOTER TOTALS BRIEF */}
              <div className="rounded-2xl bg-zinc-950 p-4 text-white dark:bg-black space-y-2 mt-4 font-mono select-none">
                <div className="flex justify-between text-xs text-zinc-450 font-bold">
                  <span>PREÇO BASE DO PACOTE:</span>
                  <span>{pacoteFields.pacotePreco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-450 font-bold">
                  <span>TAXA DE DESLOCAMENTO:</span>
                  <span>{eventoFields.taxa_deslocamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>

                {/* Loose items listed under logistics displacement */}
                {pacoteFields.itens.map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between text-[11px] text-amber-400 pl-2">
                    <span className="truncate max-w-[200px]">+ {item.descricao} ({item.quantidade}x):</span>
                    <span>{(item.precoUnitario * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}

                <div className="flex justify-between border-t border-zinc-850 pt-2 text-sm font-black text-secondary">
                  <span>VALOR TOTAL GERAL:</span>
                  <span>{pacoteFields.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              {/* ACTION DIALOG FOOTER */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="w-1/2 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Mudar de Idéia
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-secondary py-3 text-xs font-black text-white shadow-md transition-all hover:bg-secondary-dark hover:shadow-orange-500/20"
                >
                  Salvar e Iniciar Proposta
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DETAIL AND ACTION EDIT MODAL (STATE MACHINE GATE) */}
      <AnimatePresence>
        {selectedOrcamento && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl border border-gray-150 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden max-h-[90vh] flex flex-col"
            >
              
              {/* Modal Header details */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/20">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Análise do Orçamento</h3>
                    <p className="text-[10px] text-gray-400 font-mono font-bold flex items-center gap-1">
                      Versão: v{selectedOrcamento.versao || 1} •
                      Status: 
                      {selectedOrcamento.status === 'proposta_solicitada' && <span className="text-amber-500">Pendente de Análise</span>}
                      {(selectedOrcamento.status === 'pronto_para_envio' || selectedOrcamento.status === 'aguardando_aprovacao') && <span className="text-indigo-500">Enviada ao cliente / Aguardando Aprovação</span>}
                      {selectedOrcamento.status === 'aprovado' && <span className="text-green-500">Aprovada / Fechada</span>}
                      {selectedOrcamento.status === 'rejeitado' && <span className="text-red-500">Rejeitada</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerDeleteBudget(selectedOrcamento.id!)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-xs flex items-center gap-1 font-bold mr-1"
                    title="Excluir Orçamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOrcamento(null)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* STATUS DO ORÇAMENTO (SÓ EM MODO DE EDIÇÃO) */}
                {isEditingOrcamento && (
                  <div className="rounded-2xl p-4 border border-orange-250 bg-orange-50/10 dark:bg-orange-950/10 space-y-2">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-orange-200 dark:border-orange-900/40">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Status do Orçamento</span>
                    </div>
                    <div>
                      <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Alterar Status</label>
                      <select
                        id="select_budget_status"
                        value={budgetEditingStatus}
                        onChange={(e) => setBudgetEditingStatus(e.target.value as any)}
                        className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-200 font-bold"
                      >
                        <option value="proposta_solicitada">Pendente de Análise</option>
                        <option value="pronto_para_envio">Pronto para Envio</option>
                        <option value="aguardando_aprovacao">Aguardando Aprovação (Enviado)</option>
                        <option value="aprovado">Aprovado / Fechado</option>
                        <option value="rejeitado">Rejeitado</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Sub-panels in accordion style or clearly visible panels */}

                {/* DADOS DO CLIENTE DETAILS */}
                <div className="rounded-2xl p-4 border border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2 dark:border-zinc-800">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Dados do Cliente
                    </h4>
                    
                    {!isEditingOrcamento && (
                      <button
                        onClick={() => setIsEditingOrcamento(true)}
                        className="text-[10px] text-zinc-500 hover:text-primary flex items-center gap-1 font-bold"
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar Orçamento
                      </button>
                    )}
                  </div>

                  {isEditingOrcamento ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Nome Completo</label>
                          <input
                            type="text"
                            value={clienteFields.nomeCompleto}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">CPF</label>
                          <input
                            type="text"
                            value={clienteFields.cpf}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, cpf: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Telefone</label>
                          <input
                            type="text"
                            value={clienteFields.telefone}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, telefone: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">E-mail</label>
                          <input
                            type="text"
                            value={clienteFields.email}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      {/* Editing Address values within modal details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gray-50 pt-2 dark:border-zinc-800">
                        <div className="col-span-1">
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">CEP</label>
                          <input
                            type="text"
                            value={clienteFields.cep}
                            onChange={(e) => {
                              setClienteFields(prev => ({ ...prev, cep: e.target.value }));
                              if (e.target.value.replace(/\D/g, '').length === 8) {
                                handleCepLookup(e.target.value);
                              }
                            }}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Logradouro</label>
                          <input
                            type="text"
                            value={clienteFields.logradouro}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, logradouro: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Número</label>
                          <input
                            type="text"
                            value={clienteFields.numeroAddress}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, numeroAddress: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Bairro</label>
                          <input
                            type="text"
                            value={clienteFields.bairro}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, bairro: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Cidade</label>
                          <input
                            type="text"
                            value={clienteFields.cidade}
                            onChange={(e) => setClienteFields(prev => ({ ...prev, cidade: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-zinc-400 font-bold">Nome do Solicitante:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">{selectedOrcamento.cliente.nomeCompleto}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">CPF do Solicitante:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-250 font-mono">{selectedOrcamento.cliente.cpf || 'Não especificado'}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">Contatos cadastrados:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">{selectedOrcamento.cliente.telefone} • {selectedOrcamento.cliente.email}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">Localidade / Endereço:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">
                          {selectedOrcamento.cliente.logradouro}, nº {selectedOrcamento.cliente.numeroAddress || 'S/N'}, {selectedOrcamento.cliente.bairro} • {selectedOrcamento.cliente.cidade}-{selectedOrcamento.cliente.estado}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* DADOS DO EVENTO DETAILS */}
                <div className="rounded-2xl p-4 border border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 space-y-3">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-gray-50 pb-2 dark:border-zinc-800">
                    <Calendar className="h-3.5 w-3.5" />
                    Dados de Logística do Evento
                  </h4>

                  {isEditingOrcamento ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Tipo de Evento</label>
                          <input
                            type="text"
                            value={eventoFields.tipo_evento}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, tipo_evento: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Data de Execução</label>
                          <input
                            type="date"
                            value={eventoFields.data_evento}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, data_evento: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Local Físico / Nome do Espaço</label>
                          <input
                            type="text"
                            value={eventoFields.local_evento}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, local_evento: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1 flex items-center justify-between">
                            CEP {isSearchingCep && <span className="animate-spin text-[8px]">●</span>}
                          </label>
                          <input
                            type="text"
                            value={eventoFields.endereco_cep}
                            onChange={(e) => {
                              setEventoFields(prev => ({ ...prev, endereco_cep: e.target.value }));
                              if (e.target.value.replace(/\D/g, '').length === 8) {
                                handleEventCepLookup(e.target.value);
                              }
                            }}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Rua / Av.</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_rua}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_rua: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Número</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_numero}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_numero: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Bairro</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_bairro}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_bairro: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Cidade</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_cidade}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_cidade: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">UF</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_estado}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_estado: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Compl.</label>
                          <input
                            type="text"
                            value={eventoFields.endereco_complemento}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, endereco_complemento: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Início</label>
                          <input
                            type="time"
                            value={eventoFields.horarioInicio}
                            onChange={(e) => setEventoFields(prev => ({ ...prev, horarioInicio: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Deslocamento (R$)</label>
                          <input
                            type="number"
                            value={eventoFields.taxa_deslocamento}
                            onChange={(e) => handleBasePricingsChange(pacoteFields.pacotePreco, e.target.value)}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-zinc-400 font-bold">Segmento / Foco:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">{selectedOrcamento.evento?.tipo_evento || selectedOrcamento.evento.tipo_evento}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">Data Planejada:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-250 font-mono">{formatDateToBR(selectedOrcamento.dataEvento || selectedOrcamento.evento.data_evento)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">Espaço & Localização:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">{formatLocationOrAddress(selectedOrcamento.localEvento || selectedOrcamento.evento.local_evento) || 'Não especificado'}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-bold">Endereço do Evento:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">{formatLocationOrAddress(selectedOrcamento.enderecoEvento || selectedOrcamento.evento?.endereco_evento) || 'Não especificado'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-zinc-400 font-bold">Logística do Horário:</p>
                        <p className="font-extrabold text-gray-800 dark:text-zinc-200">Previsão às {selectedOrcamento.horarioInicio || 'A definir'} horas</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* DETALHES FINANCEIROS / PACOTES & ITENS */}
                <div className="rounded-2xl p-4 border border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2 dark:border-zinc-800">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Composição de Preços e Itens
                    </h4>

                    {isEditingOrcamento && (
                      <button
                        type="button"
                        onClick={handleAddNewItem}
                        className="text-[9px] bg-zinc-50 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-md hover:bg-zinc-100"
                      >
                        + Itens
                      </button>
                    )}
                  </div>

                  {isEditingOrcamento ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Escolher Pacote do Sistema</label>
                          <select
                            value={pacoteFields.pacoteId || 'custom'}
                            onChange={(e) => {
                              const pkgId = e.target.value;
                              if (pkgId && pkgId !== 'custom') {
                                const selected = availPackages.find(p => p.id === pkgId);
                                if (selected) {
                                  const basePrice = parseFloat(selected.preco_venda as any) || 0;
                                  const travelFee = parseFloat(eventoFields.taxa_deslocamento as any) || 0;
                                  const newSubtotal = basePrice;
                                  const newValorTotal = basePrice + travelFee;

                                  setPacoteFields(prev => ({
                                    ...prev,
                                    pacoteId: selected.id,
                                    pacoteNome: selected.titulo,
                                    pacotePreco: basePrice,
                                    subtotal: newSubtotal,
                                    taxaDeslocamento: travelFee,
                                    valorTotal: newValorTotal
                                  }));
                                }
                              } else {
                                setPacoteFields(prev => ({
                                  ...prev,
                                  pacoteId: 'custom',
                                  pacoteNome: 'Pacote Customizado'
                                }));
                              }
                            }}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          >
                            <option value="custom">-- Pacote Customizado/Manualmente --</option>
                            {availPackages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.titulo} ({pkg.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Título do Combo Pacote (Editável)</label>
                          <input
                            type="text"
                            value={pacoteFields.pacoteNome}
                            onChange={(e) => setPacoteFields(prev => ({ ...prev, pacoteNome: e.target.value }))}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-extrabold text-gray-450 uppercase block mb-1">Preço Base do Pacote (R$)</label>
                          <input
                            type="number"
                            value={pacoteFields.pacotePreco}
                            onChange={(e) => handleBasePricingsChange(e.target.value, eventoFields.taxa_deslocamento)}
                            className="w-full rounded-lg border border-gray-150 p-2 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250"
                          />
                        </div>
                      </div>

                      {/* Items adjustment inside detail edit */}
                      {pacoteFields.itens.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                          <div className="p-1.5 bg-gray-50 uppercase text-[8px] font-black grid grid-cols-12 gap-1 text-gray-400 border-b border-gray-100">
                            <div className="col-span-6">Serviço/Equipamento</div>
                            <div className="col-span-2 text-center">Quant.</div>
                            <div className="col-span-3 text-right">Unitário (R$)</div>
                            <div className="col-span-1"></div>
                          </div>
                          {pacoteFields.itens.map(item => (
                            <div key={item.id} className="p-1.5 grid grid-cols-12 gap-1.5 items-center">
                              <div className="col-span-6">
                                <input
                                  type="text"
                                  value={item.descricao}
                                  onChange={(e) => handleItemFieldChange(item.id, 'descricao', e.target.value)}
                                  className="w-full b-none bg-transparent outline-none p-0 focus:underline text-[11px]"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => handleItemFieldChange(item.id, 'quantidade', e.target.value)}
                                  className="w-full text-center bg-transparent border-none p-0 outline-none text-[11px]"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="number"
                                  value={item.precoUnitario}
                                  onChange={(e) => handleItemFieldChange(item.id, 'precoUnitario', e.target.value)}
                                  className="w-full text-right bg-transparent border-none p-0 outline-none text-[11px]"
                                />
                              </div>
                              <div className="col-span-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-500 hover:text-red-650"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-bold">Pacote Selecionado:</span>
                        <span className="font-extrabold text-gray-800 dark:text-zinc-200">{selectedOrcamento.pacote.pacoteNome || 'Customizado'}</span>
                      </div>
                    </div>
                  )}

                  {/* Pricing recap */}
                  <div className="rounded-xl bg-zinc-950 p-3 text-white dark:bg-black space-y-1 mt-2 font-mono">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Valor Base Pacote:</span>
                      <span>{(isEditingOrcamento ? pacoteFields.pacotePreco : (selectedOrcamento.pacote.pacotePreco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Deslocamento Logístico:</span>
                      <span>{(isEditingOrcamento ? eventoFields.taxa_deslocamento : (selectedOrcamento.evento.taxaDeslocamento ?? selectedOrcamento.evento.taxa_deslocamento ?? selectedOrcamento.pacote?.taxaDeslocamento ?? 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>

                    {/* Loose items listed under logistics displacement */}
                    {(isEditingOrcamento ? pacoteFields.itens : (selectedOrcamento.pacote.itens || [])).map((item, idx) => (
                      <div key={item.id || idx} className="flex justify-between text-[10px] text-amber-400 pl-2">
                        <span className="truncate max-w-[200px]">+ {item.descricao} ({item.quantidade}x):</span>
                        <span>{(item.precoUnitario * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}

                    <div className="flex justify-between border-t border-zinc-850 pt-1.5 text-xs font-black text-secondary">
                      <span>VALOR FINAL DO ORÇAMENTO:</span>
                      <span>{(isEditingOrcamento ? pacoteFields.valorTotal : (selectedOrcamento.pacote.valorTotal || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION DIALOG FOOTER & WORKFLOW DECISIONS */}
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                
                {/* 1. STATE: PENDENTE DE ANÁLISE ACTION TRIPLE GATES */}
                {selectedOrcamento.status === 'proposta_solicitada' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {isEditingOrcamento ? (
                      <button
                        type="button"
                        onClick={handleSaveBudgetChanges}
                        className="flex-1 rounded-xl bg-orange-500 py-3 text-xs font-black text-white hover:bg-orange-600 shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        Confirmar Alterações
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingOrcamento(true)}
                          className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-350 dark:bg-zinc-900"
                        >
                          Modificar Valores
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBudgetChanges}
                          className="flex-1 rounded-xl bg-green-600 py-3 text-xs font-black text-white hover:bg-green-700 shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-4 w-4" />
                          Salvar Alterações
                        </button>
                        <button
                          type="button"
                          disabled={isSendingProposal}
                          onClick={handleSendProposal}
                          className={`flex-1 rounded-xl py-3 text-xs font-black text-white shadow-md flex items-center justify-center gap-1.5 transition-all ${
                            isSendingProposal
                              ? 'bg-indigo-400 cursor-not-allowed opacity-80'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          <Send className="h-4 w-4" />
                          {isSendingProposal ? 'Enviando...' : 'Enviar proposta'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 2. STATE: ENVIADO / OUTWARD WAITING COPIES */}
                {(selectedOrcamento.status === 'pronto_para_envio' || selectedOrcamento.status === 'aguardando_aprovacao') && (
                  <div className="flex gap-2">
                    {isEditingOrcamento ? (
                      <button
                        type="button"
                        onClick={handleSaveBudgetChanges}
                        className="flex-1 rounded-xl bg-orange-500 py-3 text-xs font-black text-white hover:bg-orange-600"
                      >
                        Salvar Ajustes do Orçamento
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingOrcamento(true)}
                          className="w-1/3 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-55 dark:border-zinc-800/80 dark:bg-zinc-900 dark:text-zinc-350"
                        >
                          Ajustar
                        </button>
                        <button
                          type="button"
                          onClick={handleApproveProposal}
                          className="flex-1 rounded-xl bg-green-600 py-3 text-xs font-black text-white hover:bg-green-750 shadow-md"
                        >
                          Marcar como Aprovado
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectProposal}
                          className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-black text-white hover:bg-red-750"
                        >
                          Marcar como Rejeitado
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 3. STATE: REJEITADO (FLUXO DE CÓPIA DETECTOR) */}
                {selectedOrcamento.status === 'rejeitado' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRefitProposal}
                      className="w-full rounded-xl bg-secondary py-3 text-xs font-black text-white shadow-md hover:bg-secondary-dark flex items-center justify-center gap-1.5 border border-secondary-dark"
                    >
                      <RotateCcw className="h-4 w-4 animate-spin-slow" />
                      Refazer Proposta / Criar Nova Versão (v{(selectedOrcamento.versao || 1) + 1})
                    </button>
                  </div>
                )}

                {/* 4. STATE: APPROVED (READONLY CONTRACT GEN FLUIDS) */}
                {selectedOrcamento.status === 'aprovado' && (
                  <div className="flex">
                    <div className="w-full text-center py-2 bg-green-50/50 dark:bg-green-950/10 rounded-xl text-green-700 dark:text-green-400 font-extrabold text-[11px] flex items-center justify-center gap-1.5 select-none">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Proposta aprovada definitivamente e fechada no sistema corporativo!
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE ORÇAMENTO */}
      {budgetToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-gray-150 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 mb-4">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Excluir Orçamento?</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 font-semibold">
              Tem certeza de que deseja remover permanentemente este orçamento? Esta operação não poderá ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBudgetToDelete(null)}
                className="flex-1 rounded-xl border border-gray-150 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-850"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteBudget}
                className="flex-1 rounded-xl bg-red-650 py-2.5 text-xs font-black text-white hover:bg-red-750 shadow-md shadow-red-500/10"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTRATO */}
      {contractToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-gray-150 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 mb-4">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Excluir Contrato?</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 font-semibold">
              Tem certeza de que deseja remover permanentemente este contrato? Esta operação não poderá ser desfeita legalmente.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
                className="flex-1 rounded-xl border border-gray-150 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-850"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteContract}
                className="flex-1 rounded-xl bg-red-650 py-2.5 text-xs font-black text-white hover:bg-red-750 shadow-md shadow-red-500/10"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* FICHA DETALHADA DO CONTRATO ADAPTADA PARA TELA INTEGRADA NO SISTEMA */}

      {/* DIALOG SIGNED: NEW CONTRACT / CONTRATO */}
        {showAddContractModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato Assinado'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddContractModal(false);
                  setEditingContrato(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await handleAddContractSubmit(e);
                setSelectedContrato(null);
              }} 
              className="mt-4 space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-750 dark:text-zinc-300">
                    Pacote escolhido
                  </label>
                  <button
                    type="button"
                    onClick={handleAddContractItem}
                    className="text-[10px] bg-secondary/15 text-secondary font-black hover:bg-secondary/25 px-2 py-0.5 rounded-lg transition-all"
                  >
                    + Adicionar Equipamento / Item
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="Ex: Pacote Som e Luz Completo"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              {/* Items detail list for Contract */}
              {contractItems.length > 0 ? (
                <div className="border border-gray-100 dark:border-zinc-800/85 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-gray-50/80 dark:bg-zinc-950/20 p-2 text-[10px] uppercase font-bold grid grid-cols-12 gap-2 text-gray-400 border-b border-gray-100 dark:border-zinc-800">
                    <div className="col-span-6">Equipamento / Serviço</div>
                    <div className="col-span-2 text-center">Quant.</div>
                    <div className="col-span-3 text-right">Unitário (R$)</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-zinc-800/60 max-h-40 overflow-y-auto">
                    {contractItems.map(item => (
                      <div key={item.id} className="p-2 grid grid-cols-12 gap-2 items-center bg-white dark:bg-zinc-900">
                        <div className="col-span-6">
                          <input
                            type="text"
                            required
                            value={item.descricao}
                            onChange={(e) => handleContractItemFieldChange(item.id, 'descricao', e.target.value)}
                            placeholder="Ex: Caixa de Som Ativa"
                            className="w-full bg-transparent border-b border-dashed border-gray-200 outline-none p-0.5 text-xs focus:border-secondary dark:border-zinc-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantidade}
                            onChange={(e) => handleContractItemFieldChange(item.id, 'quantidade', e.target.value)}
                            className="w-full bg-transparent text-center border-b border-dashed border-gray-200 outline-none p-0.5 focus:border-secondary dark:border-zinc-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            required
                            value={item.precoUnitario}
                            onChange={(e) => handleContractItemFieldChange(item.id, 'precoUnitario', e.target.value)}
                            className="w-full bg-transparent text-right border-b border-dashed border-gray-200 outline-none p-0.5 focus:border-secondary dark:border-zinc-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-1 text-center font-bold">
                          <button
                            type="button"
                            onClick={() => handleRemoveContractItem(item.id)}
                            className="text-red-550 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                  Cliente Assinante
                </label>
                <input
                  type="text"
                  required
                  value={contractClient}
                  onChange={(e) => setContractClient(e.target.value)}
                  placeholder="Nome do Cliente"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    value={contratanteCpf}
                    onChange={(e) => setContratanteCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Local do Evento
                  </label>
                  <input
                    type="text"
                    required
                    value={localEvento}
                    onChange={(e) => setLocalEvento(e.target.value)}
                    placeholder="Local"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={contratanteEndereco}
                    onChange={(e) => setContratanteEndereco(e.target.value)}
                    placeholder="Rua..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={contratanteNumero}
                    onChange={(e) => setContratanteNumero(e.target.value)}
                    placeholder="Nº"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={contratanteCidade}
                    onChange={(e) => setContratanteCidade(e.target.value)}
                    placeholder="Cidade"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={contratanteEstado}
                    onChange={(e) => setContratanteEstado(e.target.value)}
                    placeholder="Estado"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
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
                    value={contractValue}
                    onChange={(e) => handleContractValueChange(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 uppercase leading-tight">
                    30% Entrada: <span className="font-bold text-gray-600 dark:text-zinc-300">{(parseFloat(contractValue) * 0.3 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> <br /> 70% Restante: <span className="font-bold text-gray-600 dark:text-zinc-300">{(parseFloat(contractValue) * 0.7 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                    Data de Execução
                  </label>
                  <input
                    type="date"
                    required
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                  Status do Contrato
                </label>
                <select
                  value={contractStatus}
                  onChange={(e) => setContractStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                >
                  <option value="em análise">Em análise</option>
                  <option value="aguardando assinatura">Aguardando assinatura</option>
                  <option value="assinado">Assinado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddContractModal(false);
                    setEditingContrato(null);
                  }}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-650 transition-all hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-secondary-dark"
                >
                  {editingContrato ? 'Salvar Alterações' : 'Criar Contrato'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Simple loader icon
function LoaderIcon() {
  return (
    <span className="inline-block relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
    </span>
  );
}
