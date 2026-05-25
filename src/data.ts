import { Client, TeamMember, Equipment, DocumentItem } from './types';

// Initial default data
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    nomeCompleto: 'Arthur Roberto de Melo',
    name: 'Arthur Roberto de Melo',
    cpf: '123.456.789-01',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numeroAddress: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    complemento: 'Apto 42',
    telefone: '11999999999',
    phone: '11999999999',
    email: 'arthur.melo@empresa.com.br',
    fotoCliente: '',
    tipoCliente: 'Cliente VIP',
    whatsappMessage: 'Olá Arthur, gostaríamos de confirmar os equipamentos para o evento corporativo!'
  },
  {
    id: 'c2',
    nomeCompleto: 'Amanda Souza Produções',
    name: 'Amanda Souza Produções',
    cpf: '987.654.321-09',
    cep: '22041-001',
    logradouro: 'Rua Barata Ribeiro',
    numeroAddress: '250',
    bairro: 'Copacabana',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    complemento: 'SALA 505',
    telefone: '21988888888',
    phone: '21988888888',
    email: 'amanda.souza@producoes.com',
    fotoCliente: '',
    tipoCliente: 'Cliente oficial',
    whatsappMessage: 'Olá Amanda, segue em anexo o relatório técnico do palco principal.'
  }
];

export const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eq1',
    nome: 'Line Array Ativo RCF 10" (Par)',
    categoria: 'Sonorização',
    descricao: 'Sistema de caixas acústicas line-array de alta fidelidade e projeção para grandes ambientes.',
    foto_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    fotos: ['https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'],
    foto_capa_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    preco: 450,
    ativo: true,
    is_kit: false,
    componentes: [],
    atualizado_em: '2026-05-22T14:59:14.000Z'
  },
  {
    id: 'eq2',
    nome: 'Subwoofer Ativo RCF 18" (Unidade)',
    categoria: 'Sonorização',
    descricao: 'Subgrave ativo de extrema potência para reforço de frequências baixas.',
    foto_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    fotos: ['https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'],
    foto_capa_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    preco: 300,
    ativo: true,
    is_kit: false,
    componentes: [],
    atualizado_em: '2026-05-22T14:59:14.000Z'
  },
  {
    id: 'eq3',
    nome: 'Moving Head LED Beam 230W 7R',
    categoria: 'Iluminação',
    descricao: 'Projetor de feixes Beam de alta intensidade e rotação de gobos prismáticos.',
    foto_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    fotos: ['https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'],
    foto_capa_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    preco: 180,
    ativo: true,
    is_kit: false,
    componentes: [],
    atualizado_em: '2026-05-22T14:59:14.000Z'
  },
  {
    id: 'eq4',
    nome: 'Canhão Refletor LED Par 64 RGBW',
    categoria: 'Iluminação',
    descricao: 'Projetor LED de cores vibrantes com misturas RGBW para cenografia de palco.',
    foto_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    fotos: ['https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'],
    foto_capa_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    preco: 50,
    ativo: true,
    is_kit: false,
    componentes: [],
    atualizado_em: '2026-05-22T14:59:14.000Z'
  },
  {
    id: 'eq5',
    nome: 'Estrutura Box Truss Q30 (Metro)',
    categoria: 'Estruturas',
    descricao: 'Estrutura de alumínio modular Q30 de alta resistência para suporte de som e luz.',
    foto_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    fotos: ['https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg'],
    foto_capa_url: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
    preco: 25,
    ativo: true,
    is_kit: false,
    componentes: [],
    atualizado_em: '2026-05-22T14:59:14.000Z'
  }
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm1',
    nome: 'Carlos Oliveira',
    funcao: 'Técnico de PA / Master',
    diaria: 250,
    foto_url: 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png',
    ativo: true,
    usuario_id: null,
    name: 'Carlos Oliveira',
    role: 'Técnico de PA / Master',
    dailyRate: 250
  },
  {
    id: 'tm2',
    nome: 'Marcos Pires',
    funcao: 'Técnico de Iluminação / Lâmpada',
    diaria: 220,
    foto_url: 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png',
    ativo: true,
    usuario_id: null,
    name: 'Marcos Pires',
    role: 'Técnico de Iluminação / Lâmpada',
    dailyRate: 220
  },
  {
    id: 'tm3',
    nome: 'Júlio Silva',
    funcao: 'Auxiliar de Montagem (Roadie)',
    diaria: 150,
    foto_url: 'https://videoshack.com.br/wp-content/uploads/2023/10/tecnico-de-som.png',
    ativo: true,
    usuario_id: null,
    name: 'Júlio Silva',
    role: 'Auxiliar de Montagem (Roadie)',
    dailyRate: 150
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc1',
    title: 'Sonorização Casamento Amanda & Pedro',
    clientName: 'Amanda Souza Produções',
    value: 2800,
    type: 'orcamento',
    date: '2026-05-25'
  },
  {
    id: 'doc2',
    title: 'Festival da Cerveja de Blumenau',
    clientName: 'Prefeitura Municipal',
    value: 12500,
    type: 'contrato',
    date: '2026-06-12'
  }
];

// Helper functions for LocalStorage management
export const loadData = <T>(key: string, defaults: T[]): T[] => {
  const data = localStorage.getItem(`als_${key}`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return defaults;
    }
  }
  // Store defaults initially too
  saveData(key, defaults);
  return defaults;
};

export const saveData = <T>(key: string, value: T[]): void => {
  localStorage.setItem(`als_${key}`, JSON.stringify(value));
};
