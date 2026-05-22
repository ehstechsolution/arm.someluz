export type Theme = 'dark' | 'light';

export interface Client {
  id: string;
  nomeCompleto: string;
  cpf: string;
  cep: string;
  logradouro: string;
  numeroAddress: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  telefone: string;
  email: string;
  fotoCliente: string;
  tipoCliente: 'Lead frio' | 'Lead quente' | 'Cliente oficial' | 'Cliente VIP';
  whatsappMessage?: string;
  // Fallbacks to maintain simple references
  name?: string;
  phone?: string;
}

export interface TeamMember {
  id: string;
  nome: string;
  funcao: string;
  diaria: number;
  foto_url: string;
  ativo: boolean;
  usuario_id: string | null;
  atualizado_em?: any;
  // Fallbacks for legacy components
  name?: string;
  role?: string;
  dailyRate?: number;
}

export interface EquipmentComponent {
  equipamento_id: string;
  quantidade: number;
}

export interface Equipment {
  id: string;
  categoria: 'Paineis e Pistas' | 'Estruturas' | 'Sonorização' | 'Iluminação';
  nome: string;
  descricao: string;
  foto_url: string;
  preco: number;
  ativo: boolean;
  is_kit: boolean;
  componentes: EquipmentComponent[];
  atualizado_em?: any;
}

export interface DocumentItem {
  id: string;
  title: string;
  clientName: string;
  value: number;
  type: 'orcamento' | 'contrato';
  date: string;
}

export interface PackageItem {
  equipamento_id: string;
  quantidade: number;
  nome?: string;
}

export interface PackageCombo {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: 'Completo' | 'Som' | 'Som & Luz' | 'Iluminação' | 'Efeitos Especiais';
  foto_url: string;
  ativo: boolean;
  itens: PackageItem[];
  atualizado_em?: any;
}
