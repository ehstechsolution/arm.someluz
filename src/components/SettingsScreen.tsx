import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Sun, Moon, Building, Check, 
  X, User, Phone, Mail, Camera, UploadCloud,
  RotateCw, Sliders, ZoomIn, RefreshCw, Shield,
  CreditCard, MapPin, Search, Instagram, Youtube, Facebook
} from 'lucide-react';
import { Theme } from '../types';
import { 
  getFirebaseDb, 
  doc, 
  setDoc, 
  getDoc,
  handleFirestoreError, 
  OperationType 
} from '../firebase';

interface SettingsProps {
  userId: string | null;
  userProfile: {
    nome: string;
    avatar: string;
    telefone: string;
    email: string;
    termoUso: boolean;
    nivelAcesso: string;
    cpf?: string;
    endereco?: string;
  };
  onProfileUpdate: (updated: {
    nome: string;
    avatar: string;
    telefone: string;
    email: string;
    termoUso: boolean;
    nivelAcesso: string;
    cpf?: string;
    endereco?: string;
  }) => void;
  theme: Theme;
  onThemeToggle: () => void;
  onLogout: () => void;
}

const AVATAR_PRESETS = [
  "https://cdn-icons-png.freepik.com/512/10100/10100139.png",
  "https://cdn-icons-png.freepik.com/512/3135/3135715.png",
  "https://cdn-icons-png.freepik.com/512/3135/3135768.png",
  "https://cdn-icons-png.freepik.com/512/4140/4140048.png"
];

export interface CityConfigRow {
  cidade: string;
  transporte: number;
  funcionario: number;
  dj: number;
  custo_cidade: number;
}

export const SP_CITIES = [
  "São Paulo (Capital)",
  "Americana",
  "Anhembi",
  "Araçatuba",
  "Araraquara",
  "Areiópolis",
  "Avaré",
  "Barra Bonita",
  "Barueri",
  "Bauru",
  "Bofete",
  "Botucatu",
  "Campinas",
  "Carapicuíba",
  "Conchas",
  "Cotia",
  "Diadema",
  "Embu das Artes",
  "Franca",
  "Guarujá",
  "Guarulhos",
  "Hortolândia",
  "Igaraçu do Tietê",
  "Indaiatuba",
  "Itapevi",
  "Itaquaquecetuba",
  "Itatinga",
  "Jacareí",
  "Jundiaí",
  "Laranjal Paulista",
  "Lençóis Paulista",
  "Limeira",
  "Macatuba",
  "Marília",
  "Mauá",
  "Mogi das Cruzes",
  "Osasco",
  "Pardinho",
  "Piracicaba",
  "Pratânia",
  "Praia Grande",
  "Presidente Prudente",
  "Ribeirão Preto",
  "Rio Claro",
  "Santo André",
  "Santos",
  "São Bernardo do Campo",
  "São Carlos",
  "São José do Rio Preto",
  "São José dos Campos",
  "São Manuel",
  "São Vicente",
  "Sorocaba",
  "Sumaré",
  "Suzano",
  "Taboão da Serra",
  "Taubaté"
];

export default function SettingsScreen({
  userId,
  userProfile,
  onProfileUpdate,
  theme,
  onThemeToggle,
  onLogout
}: SettingsProps) {
  // Mobile UI Edit Overlay Switch state
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Form States
  const [editNome, setEditNome] = useState(userProfile.nome);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [editTelefone, setEditTelefone] = useState(userProfile.telefone);
  const [editNivelAcesso, setEditNivelAcesso] = useState(userProfile.nivelAcesso || 'Equipe');
  const [editCpf, setEditCpf] = useState(userProfile.cpf || '');
  const [editEndereco, setEditEndereco] = useState(userProfile.endereco || '');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // General Settings States
  const [companyDetails, setCompanyDetails] = useState(() => localStorage.getItem('als_company_details') || 'Arthur Luz e Som LTDA | CNPJ: 45.123.888/0001-90');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New persistent Firebase Company Config States
  const [companyNomeFantasia, setCompanyNomeFantasia] = useState('Arthur Luz e Som');
  const [companyRazaoSocial, setCompanyRazaoSocial] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyCep, setCompanyCep] = useState('');
  const [companyEndereco, setCompanyEndereco] = useState('');
  const [companyLinkInstagram, setCompanyLinkInstagram] = useState('');
  const [companyLinkYoutube, setCompanyLinkYoutube] = useState('');
  const [companyLinkFacebook, setCompanyLinkFacebook] = useState('');
  
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSearchingCompanyCep, setIsSearchingCompanyCep] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companySuccess, setCompanySuccess] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  // Offset City Config (Cálculo de deslocamento) States
  const [cityConfigs, setCityConfigs] = useState<CityConfigRow[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isSavingCities, setIsSavingCities] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [citiesSuccess, setCitiesSuccess] = useState(false);

  // Modal / Form input states for adding/editing a city config
  const [isEditingCityForm, setIsEditingCityForm] = useState(false);
  const [editingCityIndex, setEditingCityIndex] = useState<number | null>(null);
  
  const [inputCidade, setInputCidade] = useState(SP_CITIES[0]);
  const [inputTransporte, setInputTransporte] = useState<number>(0);
  const [inputFuncionario, setInputFuncionario] = useState<number>(0);
  const [inputDj, setInputDj] = useState<number>(0);

  // Custom Image Upload and Interactive Cropper States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImageSource, setLocalImageSource] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // Cropper sliders & coordinates
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isUploadingToCloudinary, setIsUploadingToCloudinary] = useState(false);
  const [cloudinaryUploadedUrl, setCloudinaryUploadedUrl] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCompanyConfig = async () => {
      if (userProfile.nivelAcesso !== 'Administrador') return;
      const db = getFirebaseDb();
      if (!db) return;
      setIsLoadingCompany(true);
      try {
        const docRef = doc(db, 'config', 'empresa');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyNomeFantasia(data.nomeFantasia || '');
          setCompanyRazaoSocial(data.razaoSocial || '');
          setCompanyCnpj(data.cnpj || '');
          setCompanyLogo(data.logo || '');
          setCompanyCep(data.cep || '');
          setCompanyEndereco(data.endereco || '');
          setCompanyLinkInstagram(data.linkInstagram || '');
          setCompanyLinkYoutube(data.linkYoutube || '');
          setCompanyLinkFacebook(data.linkFacebook || '');
        }
      } catch (err) {
        console.error('Erro ao buscar as configurações da empresa:', err);
      } finally {
        setIsLoadingCompany(false);
      }
    };

    loadCompanyConfig();
  }, [userProfile.nivelAcesso]);

  useEffect(() => {
    const loadCitiesConfig = async () => {
      if (userProfile.nivelAcesso !== 'Administrador') return;
      
      const cached = localStorage.getItem('als_cidades_config');
      if (cached) {
        try {
          setCityConfigs(JSON.parse(cached));
        } catch (e) {
          console.error(e);
        }
      }

      const db = getFirebaseDb();
      if (!db) return;
      setIsLoadingCities(true);
      try {
        const docRef = doc(db, 'config', 'cidades');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.itens)) {
            setCityConfigs(data.itens);
            localStorage.setItem('als_cidades_config', JSON.stringify(data.itens));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar as configurações de cidades:', err);
      } finally {
        setIsLoadingCities(false);
      }
    };

    loadCitiesConfig();
  }, [userProfile.nivelAcesso]);

  // Sync state with settings screen initialization
  const openEditModal = () => {
    setEditNome(userProfile.nome);
    setEditAvatar(userProfile.avatar);
    setEditTelefone(userProfile.telefone);
    setEditNivelAcesso(userProfile.nivelAcesso || 'Equipe');
    setEditCpf(userProfile.cpf || '');
    setEditEndereco(userProfile.endereco || '');
    setCep('');
    setNumero('');
    setComplemento('');
    setProfileError('');
    setLocalImageSource(null);
    setCloudinaryUploadedUrl(null);
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setPanOffset({ x: 0, y: 0 });
    setIsEditingProfile(true);
  };

  // Drag and drop events for profile photo
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProfileError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLocalImageSource(event.target.result as string);
        setZoom(1.2); // Start with logical zoom for cropping convenience
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Image Panning Mouse/Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!localImageSource) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    if (previewContainerRef.current) {
      previewContainerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStart.x;
    const newY = e.clientY - panStart.y;
    // Bound the panning logic roughly based on image dimensions
    setPanOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (previewContainerRef.current) {
      previewContainerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Processing the tailored Canvas to generate cropped final image
  const handleCropAndUpload = async () => {
    if (!localImageSource) return;
    setIsUploadingToCloudinary(true);
    setProfileError('');

    try {
      // 1. Load image into memory
      const img = new Image();
      img.src = localImageSource;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Falha ao carregar imagem para renderização.'));
      });

      // 2. Setup dynamic offscreen canvas (Perfect square 350x350 for sharp avatars)
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = 350;
      croppedCanvas.height = 350;
      const ctx = croppedCanvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível obter contexto do editor gráfico.');

      // Clear with elegant solid base background
      ctx.fillStyle = '#18181b'; // zinc-900 background color in dark modes
      ctx.fillRect(0, 0, 350, 350);

      // 3. Move origin to center of canvas to rotate & scale correctly
      ctx.translate(175, 175);

      // Apply CSS style visual adjustments to context if supported, or apply filters
      // Brightness / Contrast canvas support mapping
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      // Apply Rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw the image scaled and panned relative to center offset
      const originalWidth = img.width;
      const originalHeight = img.height;
      const minDimension = Math.min(originalWidth, originalHeight);
      
      // Scale calculation to fill container
      const baseScale = 260 / minDimension; 
      const drawWidth = originalWidth * baseScale * zoom;
      const drawHeight = originalHeight * baseScale * zoom;

      // Draw image shifted by pan coordinate offsets relative to center translation points
      ctx.drawImage(
        img, 
        -drawWidth / 2 + panOffset.x, 
        -drawHeight / 2 + panOffset.y, 
        drawWidth, 
        drawHeight
      );

      // 4. Transform canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        croppedCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Falha ao gerar o arquivo compactado da imagem.');

      // 5. Direct Upload call to Cloudinary unauthenticated preset
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'perfil_clientes');

      const clResponse = await fetch('https://api.cloudinary.com/v1_1/dnatvwcxy/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!clResponse.ok) {
        const errBody = await clResponse.text();
        console.error('Cloudinary detailed response error message:', errBody);
        throw new Error('Falha ao obter reposta do servidor de mídia Cloudinary.');
      }

      const clData = await clResponse.json();
      if (clData.secure_url) {
        setEditAvatar(clData.secure_url);
        setCloudinaryUploadedUrl(clData.secure_url);
        setLocalImageSource(null); // Return to default save flow with new target
      } else {
        throw new Error('URL segura do Cloudinary vazia na resposta.');
      }
    } catch (err: any) {
      console.error(err);
      setProfileError(`Falha ao processar e salvar imagem: ${err.message || err}`);
    } finally {
      setIsUploadingToCloudinary(false);
    }
  };

  // Dynamic formatting phone number mask (xx) xxxxx-xxxx
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Dynamic CPF format mask: xxx.xxx.xxx-xx
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Standard CPF verification digit validation
  const validateCPF = (cpfValue: string): boolean => {
    const clean = cpfValue.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(clean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(clean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(10, 11))) return false;
    
    return true;
  };

  // Dynamic CEP format mask: xxxxx-xxx
  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setProfileError('O CEP deve conter 8 dígitos.');
      return;
    }
    setIsSearchingCep(true);
    setProfileError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) {
        throw new Error('Falha de conexão com o serviço de CEP.');
      }
      const data = await response.json();
      if (data.erro) {
        setProfileError('CEP não encontrado. Por favor, digite o endereço manualmente ou revise o CEP.');
      } else {
        const parts = [];
        if (data.logradouro) parts.push(data.logradouro);
        if (numero) parts.push(numero);
        if (complemento) parts.push(complemento);
        if (data.bairro) parts.push(data.bairro);
        if (data.localidade) parts.push(`${data.localidade} - ${data.uf}`);
        if (cleanCep) parts.push(`CEP: ${formatCep(cleanCep)}`);
        
        const formatted = `${data.logradouro || ''}${numero ? ', ' + numero : ''}${complemento ? ' - ' + complemento : ''}${data.bairro ? ' - ' + data.bairro : ''}${data.localidade ? ' - ' + data.localidade : ''}${data.uf ? '/' + data.uf : ''}${cleanCep ? ' - CEP: ' + formatCep(cleanCep) : ''}`;
        setEditEndereco(formatted);
      }
    } catch (err: any) {
      setProfileError('Falha ao buscar o CEP desejado. Verifique sua conexão ou preencha manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setIsSavingProfile(true);

    if (!editNome.trim()) {
      setProfileError('O campo nome completo é obrigatório.');
      setIsSavingProfile(false);
      return;
    }

    if (editTelefone && editTelefone.length < 14) {
      setProfileError('Por favor, digite um telefone válido no formato (xx) xxxxx-xxxx.');
      setIsSavingProfile(false);
      return;
    }

    // CPF validation (only validates if not empty)
    if (editCpf && editCpf.trim() !== '') {
      if (!validateCPF(editCpf)) {
        setProfileError('O CPF informado é inválido. Verifique se os números estão corretos.');
        setIsSavingProfile(false);
        return;
      }
    }

    const updatedData = {
      nome: editNome.trim(),
      avatar: editAvatar || "https://cdn-icons-png.freepik.com/512/10100/10100139.png",
      telefone: editTelefone,
      email: userProfile.email,
      termoUso: userProfile.termoUso, // Preserving backend structures unmodified
      nivelAcesso: editNivelAcesso,
      cpf: editCpf,
      endereco: editEndereco
    };

    const db = getFirebaseDb();
    if (db && userId && userId !== 'sandbox_user_id') {
      try {
        const userDocRef = doc(db, 'usuarios', userId);
        await setDoc(userDocRef, updatedData);
      } catch (fsErr) {
        setIsSavingProfile(false);
        try {
          handleFirestoreError(fsErr, OperationType.WRITE, `usuarios/${userId}`);
        } catch (wrapped) {
          setProfileError('Erro de segurança do Firebase Firestore. Verique permissões.');
          return;
        }
      }
    }

    // Always update client state as well for seamless instant simulation & state sync
    onProfileUpdate(updatedData);
    setIsSavingProfile(false);
    setProfileSaveSuccess(true);
    setTimeout(() => {
      setProfileSaveSuccess(false);
      setIsEditingProfile(false);
    }, 1500);
  };

  // CNPJ mask formatting
  const formatCNPJ = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  // CNPJ digit validation
  const validateCNPJ = (cnpjValue: string): boolean => {
    const clean = cnpjValue.replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let size = clean.length - 2;
    let numbers = clean.substring(0, size);
    const digits = clean.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = clean.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  };

  // Cloudinary direct upload with target preset erp_raiz
  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    setCompanyError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'erp_raiz');

      const clResponse = await fetch('https://api.cloudinary.com/v1_1/dnatvwcxy/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!clResponse.ok) {
        throw new Error('Falha no upload do logo da empresa.');
      }

      const clData = await clResponse.json();
      if (clData.secure_url) {
        setCompanyLogo(clData.secure_url);
        setCompanySuccess(true);
        setTimeout(() => setCompanySuccess(false), 2000);
      } else {
        throw new Error('Upload concluído, mas nenhuma URL segura foi retornada.');
      }
    } catch (err: any) {
      console.error(err);
      setCompanyError(err.message || 'Erro ao fazer upload da logomarca.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Autocomplete address search by CEP
  const handleCompanyCepSearch = async () => {
    const cleanCep = companyCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCompanyError('O CEP corporativo deve conter 8 dígitos.');
      return;
    }
    setIsSearchingCompanyCep(true);
    setCompanyError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) {
        throw new Error('Falha de conexão com o serviço de CEP.');
      }
      const data = await response.json();
      if (data.erro) {
        setCompanyError('CEP corporativo não encontrado. Insira ou revise os dados.');
      } else {
        const formatted = `${data.logradouro || ''}${data.bairro ? ' - ' + data.bairro : ''}${data.localidade ? ' - ' + data.localidade : ''}${data.uf ? '/' + data.uf : ''}${cleanCep ? ' - CEP: ' + formatCep(cleanCep) : ''}`;
        setCompanyEndereco(formatted);
      }
    } catch (err: any) {
      setCompanyError('Erro ao consultar CEP. Preencha o endereço manualmente.');
    } finally {
      setIsSearchingCompanyCep(false);
    }
  };

  // Asynchronous persistent company form submit
  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError('');
    setCompanySuccess(false);

    if (!companyNomeFantasia.trim()) {
      setCompanyError('O nome fantasia da empresa é obrigatório.');
      return;
    }

    if (!companyCnpj.trim()) {
      setCompanyError('O CNPJ da empresa é obrigatório.');
      return;
    }

    if (!validateCNPJ(companyCnpj)) {
      setCompanyError('O CNPJ informado é inválido. Digite um documento real e correto.');
      return;
    }

    setIsSavingCompany(true);

    const companyData = {
      nomeFantasia: companyNomeFantasia.trim(),
      razaoSocial: companyRazaoSocial.trim(),
      cnpj: companyCnpj.trim(),
      logo: companyLogo || '',
      cep: companyCep.trim(),
      endereco: companyEndereco.trim(),
      linkInstagram: companyLinkInstagram.trim(),
      linkYoutube: companyLinkYoutube.trim(),
      linkFacebook: companyLinkFacebook.trim()
    };

    const db = getFirebaseDb();
    if (db) {
      try {
        const configDocRef = doc(db, 'config', 'empresa');
        await setDoc(configDocRef, companyData);
        
        // Save simplified representation in localStorage as well to keep legacy references synced
        localStorage.setItem('als_company_details', `${companyNomeFantasia.trim()} | CNPJ: ${companyCnpj.trim()}`);
        localStorage.setItem('als_company_config', JSON.stringify(companyData));
        setCompanyDetails(`${companyNomeFantasia.trim()} | CNPJ: ${companyCnpj.trim()}`);
        
        // Dispatch custom update event to let App.tsx re-render header or login instantly
        window.dispatchEvent(new CustomEvent('company_config_updated', { detail: companyData }));

        setCompanySuccess(true);
        setIsEditingCompany(false);
        setTimeout(() => setCompanySuccess(false), 3000);
      } catch (err: any) {
        console.error(err);
        setCompanyError('Erro ao salvar os dados da empresa no Firestore. Verifique suas regras.');
        try {
          handleFirestoreError(err, OperationType.WRITE, 'config/empresa');
        } catch (wrapped) {}
      } finally {
        setIsSavingCompany(false);
      }
    } else {
      // Offline/sandbox fallback mode
      localStorage.setItem('als_company_details', `${companyNomeFantasia.trim()} | CNPJ: ${companyCnpj.trim()}`);
      localStorage.setItem('als_company_config', JSON.stringify(companyData));
      setCompanyDetails(`${companyNomeFantasia.trim()} | CNPJ: ${companyCnpj.trim()}`);
      
      // Dispatch custom update event
      window.dispatchEvent(new CustomEvent('company_config_updated', { detail: companyData }));

      setCompanySuccess(true);
      setIsEditingCompany(false);
      setTimeout(() => setCompanySuccess(false), 3000);
      setIsSavingCompany(false);
    }
  };

  // Calculation of displacement (Cálculo de deslocamento) action handlers
  const openAddCityForm = () => {
    setEditingCityIndex(null);
    setInputCidade(SP_CITIES[0]);
    setInputTransporte(0);
    setInputFuncionario(0);
    setInputDj(0);
    setCitiesError('');
    setIsEditingCityForm(true);
  };

  const openEditCityForm = (index: number) => {
    const item = cityConfigs[index];
    setEditingCityIndex(index);
    setInputCidade(item.cidade);
    setInputTransporte(item.transporte);
    setInputFuncionario(item.funcionario);
    setInputDj(item.dj);
    setCitiesError('');
    setIsEditingCityForm(true);
  };

  const handleSaveCitiesToFirebase = async (updatedList: CityConfigRow[]) => {
    setCitiesError('');
    setCitiesSuccess(false);

    // Sync state and localStorage
    setCityConfigs(updatedList);
    localStorage.setItem('als_cidades_config', JSON.stringify(updatedList));

    const db = getFirebaseDb();
    if (db) {
      setIsSavingCities(true);
      try {
        const docRef = doc(db, 'config', 'cidades');
        await setDoc(docRef, { itens: updatedList });
        setCitiesSuccess(true);
        setTimeout(() => setCitiesSuccess(false), 3000);
      } catch (err: any) {
        console.error('Erro ao salvar as cidades no Firestore:', err);
        setCitiesError('Erro de permissão ou conexão ao salvar as configurações no Firestore.');
        try {
          handleFirestoreError(err, OperationType.WRITE, 'config/cidades');
        } catch (wrapped) {}
      } finally {
        setIsSavingCities(false);
      }
    } else {
      // Sandbox successful save
      setCitiesSuccess(true);
      setTimeout(() => setCitiesSuccess(false), 3000);
    }
  };

  const handleCityFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitiesError('');
    
    // Sum numeric inputs
    const cost = Number(inputTransporte) + Number(inputFuncionario) + Number(inputDj);
    
    const newRow: CityConfigRow = {
      cidade: inputCidade,
      transporte: Number(inputTransporte),
      funcionario: Number(inputFuncionario),
      dj: Number(inputDj),
      custo_cidade: cost
    };

    let updated: CityConfigRow[];
    if (editingCityIndex !== null) {
      updated = [...cityConfigs];
      updated[editingCityIndex] = newRow;
    } else {
      // Check uniqueness of city name
      if (cityConfigs.some(item => item.cidade === inputCidade)) {
        setCitiesError(`A cidade ${inputCidade} já está cadastrada. Modifique o item existente.`);
        return;
      }
      updated = [...cityConfigs, newRow];
    }

    await handleSaveCitiesToFirebase(updated);
    setIsEditingCityForm(false);
  };

  const handleDeleteCity = async (index: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta cidade do cálculo de deslocamento?')) {
      const updated = cityConfigs.filter((_, i) => i !== index);
      await handleSaveCitiesToFirebase(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profiler Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-2xl border border-gray-150 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {userProfile.avatar ? (
              <img 
                referrerPolicy="no-referrer"
                src={userProfile.avatar} 
                alt="Avatar" 
                className="h-16 w-16 rounded-full border-2 border-primary object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary font-extrabold text-xl border-2 border-primary shadow-xs">
                {userProfile.email ? userProfile.email.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-zinc-900"></span>
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase text-primary tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                Operador Autenticado
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {userProfile.nivelAcesso || 'Equipe'}
              </span>
            </div>
            
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                {userProfile.nome}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="truncate">{userProfile.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Informações adicionais em Grid para melhor leitura em Mobile */}
        {(userProfile.telefone || userProfile.cpf) && (
          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-zinc-800/80 pt-3 text-[11px]">
            {userProfile.telefone && (
              <div className="bg-gray-50/50 dark:bg-zinc-900/50 p-2 rounded-xl border border-gray-100/50 dark:border-zinc-800/40">
                <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Telefone</p>
                <span className="font-semibold text-gray-850 dark:text-zinc-200 flex items-center gap-1 truncate">
                  <Phone className="h-3 w-3 text-secondary shrink-0" />
                  {userProfile.telefone}
                </span>
              </div>
            )}
            {userProfile.cpf && (
              <div className="bg-gray-50/50 dark:bg-zinc-900/50 p-2 rounded-xl border border-gray-100/50 dark:border-zinc-800/40">
                <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">CPF</p>
                <span className="font-mono font-semibold text-gray-855 dark:text-zinc-200 flex items-center gap-1 truncate">
                  <CreditCard className="h-3 w-3 text-primary shrink-0" />
                  {userProfile.cpf}
                </span>
              </div>
            )}
          </div>
        )}

        {userProfile.endereco && (
          <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-3">
            <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Endereço Registrado</p>
            <div className="bg-gray-50/50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-gray-100/50 dark:border-zinc-800/40 flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-[11px] text-gray-700 dark:text-zinc-300 leading-relaxed min-w-0 flex-1">
                {userProfile.endereco}
              </span>
            </div>
          </div>
        )}

        {/* Edit Profile Action Trigger */}
        <button
          onClick={openEditModal}
          id="btn-edit-profile-trigger"
          className="active-click flex w-full h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-xs font-bold text-gray-800 transition-all dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Camera className="h-4 w-4 text-primary" />
          <span>Editar perfil</span>
        </button>
      </motion.div>

      {/* Main Configurations Block */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
          Opções do Sistema
        </h4>

        {/* Theme select panel (Aesthetic) */}
        <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-gray-950 dark:text-white">Estética do Tema</h5>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                Alternar entre Tema Escuro e Claro
              </p>
            </div>
            
            <button
              onClick={onThemeToggle}
              id="theme-toggler"
              className="active-click flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 transition-all hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="h-4 w-4 text-primary" />
                  <span>Tema Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-secondary" />
                  <span>Tema Claro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Company configuration */}
        {userProfile.nivelAcesso === 'Administrador' && (
          <div className="space-y-4">
            {!isEditingCompany ? (
              /* Read-only interactive summary card */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 rounded-2xl border border-gray-150 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {companyLogo ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={companyLogo} 
                        alt="Logo da Empresa" 
                        className="h-16 w-16 rounded-xl border border-gray-200 bg-white object-contain p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary border-2 border-dashed border-primary/30">
                        <Building className="h-6 w-6" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-500 dark:border-zinc-900 animate-pulse"></span>
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase text-primary tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                        Dados Corporativos
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/45">
                        Administrativo
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                        {companyNomeFantasia || 'Arthur Luz e Som'}
                      </h3>
                      {companyRazaoSocial && (
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                          {companyRazaoSocial}
                        </p>
                      )}
                      {companyCnpj && (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                          CNPJ: {companyCnpj}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sede da Empresa */}
                {(companyCep || companyEndereco) && (
                  <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-3">
                    <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Sede Coorporativa</p>
                    <div className="bg-gray-50/50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-gray-100/50 dark:border-zinc-800/40 flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="text-[11px] text-gray-700 dark:text-zinc-300 leading-relaxed min-w-0 flex-1">
                        {companyEndereco || 'Não informado'}
                        {companyCep && <span className="block font-mono text-[9.5px] text-gray-400 dark:text-zinc-500 mt-0.5">CEP: {companyCep}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Redes Sociais */}
                {(companyLinkInstagram || companyLinkYoutube || companyLinkFacebook) && (
                  <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-3">
                    <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Redes Sociais & Canais</p>
                    <div className="flex flex-wrap gap-2">
                      {companyLinkInstagram && (
                        <a 
                          href={companyLinkInstagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-pink-50 hover:bg-pink-150 border border-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/30 dark:border-pink-900/30 text-[10.5px] font-bold text-pink-700 dark:text-pink-400 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Instagram className="h-3.5 w-3.5 shrink-0" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {companyLinkYoutube && (
                        <a 
                          href={companyLinkYoutube} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-150 border border-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:border-red-900/30 text-[10.5px] font-bold text-red-700 dark:text-red-400 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Youtube className="h-3.5 w-3.5 shrink-0" />
                          <span>YouTube</span>
                        </a>
                      )}
                      {companyLinkFacebook && (
                        <a 
                          href={companyLinkFacebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-150 border border-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:border-blue-900/30 text-[10.5px] font-bold text-blue-700 dark:text-blue-400 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Facebook className="h-3.5 w-3.5 shrink-0" />
                          <span>Facebook</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit details trigger */}
                <button
                  type="button"
                  onClick={() => setIsEditingCompany(true)}
                  id="btn-edit-company-trigger"
                  className="active-click flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-xs font-bold text-gray-800 transition-all dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <Building className="h-4 w-4 text-primary" />
                  <span>Editar Datos da Empresa</span>
                </button>
              </motion.div>
            ) : (
              /* Live editing form mode matching exact style and fields */
              <form onSubmit={handleSaveCompanyData} className="space-y-4">
                <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="border-b border-gray-100 pb-3 mb-4 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Painel de Ajuste</span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">Editar Dados Corporativos</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingCompany(false)}
                      className="text-xs font-black text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    >
                      Voltar
                    </button>
                  </div>

                  {companyError && (
                    <div id="company-error-alert" className="mb-4 rounded-xl bg-red-50 p-3 text-[11px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                      {companyError}
                    </div>
                  )}

                  {companySuccess && (
                    <div id="company-success-alert" className="mb-4 rounded-xl bg-green-50 p-3 text-[11px] font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-400">
                      Dados da empresa salvos com sucesso no servidor!
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Logo da Empresa Upload */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-gray-100/60 dark:border-zinc-800/40">
                      <div className="relative shrink-0">
                        {companyLogo ? (
                          <img 
                            referrerPolicy="no-referrer"
                            src={companyLogo} 
                            alt="Logo da Empresa" 
                            className="h-16 w-16 rounded-xl border border-gray-200 bg-white object-contain p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary border-2 border-dashed border-primary/30">
                            <Building className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 w-full text-center sm:text-left space-y-1.5">
                        <p className="text-[11px] font-bold text-gray-700 dark:text-zinc-300">Logomarca da Empresa</p>
                        <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 leading-normal">
                          PNG ou JPG. Enviado de forma segura e otimizado direto no Cloudinary.
                        </p>
                        
                        <input 
                          type="file"
                          ref={companyLogoInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await handleLogoUpload(file);
                            }
                          }}
                        />
                        
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => companyLogoInputRef.current?.click()}
                            disabled={isUploadingLogo}
                            className="rounded-lg bg-primary/20 hover:bg-primary/30 text-gray-900 dark:text-white px-3 py-1.5 text-[10px] font-extrabold transition-colors disabled:opacity-50"
                          >
                            {isUploadingLogo ? 'Carregando...' : 'Alterar Logomarca'}
                          </button>
                          {companyLogo && (
                            <button
                              type="button"
                              onClick={() => setCompanyLogo('')}
                              className="rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 px-2 py-1.5 text-[10px] font-bold transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grid Nome Fantasia & Razão Social */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Nome Fantasia</label>
                        <input
                          type="text"
                          value={companyNomeFantasia}
                          onChange={(e) => setCompanyNomeFantasia(e.target.value)}
                          placeholder="Ex: Arthur Luz e Som"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Razão Social</label>
                        <input
                          type="text"
                          value={companyRazaoSocial}
                          onChange={(e) => setCompanyRazaoSocial(e.target.value)}
                          placeholder="Ex: Arthur Empreendimentos LTDA"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* CNPJ Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        CNPJ da Empresa
                      </label>
                      <input
                        type="text"
                        value={companyCnpj}
                        onChange={(e) => setCompanyCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0001-00"
                        maxLength={18}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                      />
                    </div>

                    {/* Localização & Endereço Corporativo */}
                    <div className="space-y-2.5 border-t border-gray-100 dark:border-zinc-800/50 pt-3">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-secondary">Sede & Endereço</span>
                      
                      {/* CEP Lookup Tool */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-zinc-800/60 dark:bg-zinc-950">
                        <p className="text-[10.5px] font-bold text-gray-600 dark:text-zinc-350 mb-2 flex items-center gap-1">
                          <Search className="h-3 w-3 text-primary" />
                          Buscar Endereço por CEP (Autocompletar)
                        </p>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={companyCep}
                              onChange={(e) => setCompanyCep(formatCep(e.target.value))}
                              placeholder="00000-050"
                              maxLength={9}
                              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCompanyCepSearch}
                            disabled={isSearchingCompanyCep || !companyCep}
                            className="active-click rounded-lg bg-primary text-gray-900 px-3.5 py-2 text-[11px] font-extrabold transition-colors disabled:opacity-40"
                          >
                            {isSearchingCompanyCep ? 'Buscando...' : 'Buscar'}
                          </button>
                        </div>
                      </div>

                      {/* Complete Company Address Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Endereço Oficial da Empresa
                        </label>
                        <textarea
                          rows={2}
                          value={companyEndereco}
                          onChange={(e) => setCompanyEndereco(e.target.value)}
                          placeholder="Identifique o CEP acima ou digite o endereço corporativo completo..."
                          className="w-full rounded-xl border border-gray-250 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-750 dark:bg-zinc-900 dark:text-white dark:focus:border-primary resize-none"
                        />
                      </div>
                    </div>

                    {/* Redes Sociais Integradas */}
                    <div className="space-y-2.5 border-t border-gray-100 dark:border-zinc-800/50 pt-3">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Canais de Atendimento / Redes Sociais</span>

                      <div className="space-y-2">
                        {/* Instagram */}
                        <div className="flex items-center gap-2">
                          <div className="h-8.5 w-8.5 rounded-xl bg-pink-100 dark:bg-pink-950/30 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
                            <Instagram className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <input
                              type="url"
                              value={companyLinkInstagram}
                              onChange={(e) => setCompanyLinkInstagram(e.target.value)}
                              placeholder="https://instagram.com/arthurluzesom"
                              className="w-full rounded-lg border border-gray-255 bg-gray-50/50 p-2 text-xs outline-none focus:border-pink-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Youtube */}
                        <div className="flex items-center gap-2">
                          <div className="h-8.5 w-8.5 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <Youtube className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <input
                              type="url"
                              value={companyLinkYoutube}
                              onChange={(e) => setCompanyLinkYoutube(e.target.value)}
                              placeholder="https://youtube.com/@arthurluzesom"
                              className="w-full rounded-lg border border-gray-255 bg-gray-50/50 p-2 text-xs outline-none focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Facebook */}
                        <div className="flex items-center gap-2">
                          <div className="h-8.5 w-8.5 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <Facebook className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <input
                              type="url"
                              value={companyLinkFacebook}
                              onChange={(e) => setCompanyLinkFacebook(e.target.value)}
                              placeholder="https://facebook.com/arthurluzesom"
                              className="w-full rounded-lg border border-gray-255 bg-gray-50/50 p-2 text-xs outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combined Save and Cancel configuration buttons in a row */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyError('');
                      setIsEditingCompany(false);
                    }}
                    className="active-click flex-1 h-11 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 transition-all dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCompany || isUploadingLogo}
                    id="btn-save-company-details"
                    className="active-click flex-[2] flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-gray-900 transition-all hover:bg-primary/95 shadow-xs disabled:opacity-50"
                  >
                    {isSavingCompany ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Salvando no Servidor...</span>
                      </>
                    ) : companySuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Salvo!</span>
                      </>
                    ) : (
                      <span>Salvar Configurações</span>
                    )}
                  </button>
                </div>
              </form>
            )}

          {/* Displacement Calculation (Cálculo de Deslocamento) Section */}
          <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-zinc-800/80">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Logística & Deslocamentos</span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">Cálculo de Deslocamento</h4>
              </div>
              
              {!isEditingCityForm && (
                <button
                  type="button"
                  onClick={openAddCityForm}
                  className="active-click rounded-lg bg-primary hover:bg-primary/95 text-gray-900 px-3 py-1.5 text-[10px] font-extrabold transition-colors shadow-xs"
                >
                  + Adicionar Cidade
                </button>
              )}
            </div>

            {citiesError && (
              <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-[11px] font-semibold text-red-500 dark:bg-red-500/5">
                {citiesError}
              </div>
            )}

            {citiesSuccess && (
              <div className="mb-4 rounded-xl bg-green-500/10 p-3 text-[11px] font-semibold text-green-500 dark:bg-green-500/5">
                Preços e regras de deslocamento sincronizados no Firebase com sucesso!
              </div>
            )}

            {/* Form to Add / Edit a City config */}
            {isEditingCityForm && (
              <div className="mb-5 p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-950/40 border border-gray-150 dark:border-zinc-800/60 text-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800/50">
                  <span className="font-extrabold text-xs text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                    {editingCityIndex !== null ? 'Editar Cidade' : 'Cadastrar Nova Cidade'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setIsEditingCityForm(false)}
                    className="text-[11px] text-red-500 font-extrabold hover:underline"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleCityFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Cidade Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Cidade (Estado de SP)</label>
                      <select
                        value={inputCidade}
                        onChange={(e) => setInputCidade(e.target.value)}
                        className="w-full rounded-xl border border-gray-250 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-750 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                      >
                        {SP_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cost total preview */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Custo Total da Cidade (Soma)</label>
                      <div className="w-full rounded-xl bg-primary/15 border border-primary/20 p-2.5 text-xs text-primary font-bold flex items-center justify-between font-mono">
                        <span>Soma Total:</span>
                        <span className="text-sm text-gray-900 dark:text-white">R$ {(Number(inputTransporte) + Number(inputFuncionario) + Number(inputDj)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Transporte */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Transporte</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inputTransporte === 0 ? '' : inputTransporte}
                          onChange={(e) => setInputTransporte(Number(e.target.value))}
                          placeholder="0,00"
                          className="w-full rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 p-2.5 pl-8 text-xs text-gray-900 dark:text-white outline-none focus:border-primary dark:border-zinc-800 font-mono"
                        />
                      </div>
                    </div>

                    {/* Funcionarios */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Funcionários</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inputFuncionario === 0 ? '' : inputFuncionario}
                          onChange={(e) => setInputFuncionario(Number(e.target.value))}
                          placeholder="0,00"
                          className="w-full rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 p-2.5 pl-8 text-xs text-gray-900 dark:text-white outline-none focus:border-primary dark:border-zinc-800 font-mono"
                        />
                      </div>
                    </div>

                    {/* DJ */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">DJ</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inputDj === 0 ? '' : inputDj}
                          onChange={(e) => setInputDj(Number(e.target.value))}
                          placeholder="0,00"
                          className="w-full rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 p-2.5 pl-8 text-xs text-gray-900 dark:text-white outline-none focus:border-primary dark:border-zinc-800 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingCityForm(false)}
                      className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 dark:bg-zinc-950/20 dark:border-zinc-855 dark:text-zinc-400 hover:bg-gray-50"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCities}
                      className="flex-[2] h-10 rounded-xl bg-primary text-xs font-extrabold text-gray-950 transition-all hover:bg-primary/95 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      {isSavingCities ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Salvando no Firebase...</span>
                        </>
                      ) : (
                        <span>Salvar Regulamento</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Loader */}
            {isLoadingCities ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[11px] text-gray-450 font-medium">Carregando tabelas de deslocamento do Firebase...</span>
              </div>
            ) : cityConfigs.length === 0 ? (
              /* Empty state placeholder */
              <div className="text-center py-8 px-4 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl bg-gray-50/20">
                <MapPin className="h-7 w-7 text-gray-300 dark:text-zinc-700 mx-auto stroke-1" />
                <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 mt-2">Nenhuma cidade cadastrada</p>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Cadastre as tarifas e custos de logística por cidade.</p>
              </div>
            ) : (
              /* Mobile optimized modern rows */
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                {cityConfigs.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/30 dark:border-zinc-850 dark:bg-zinc-950/20 hover:border-gray-200 dark:hover:border-zinc-800 transition-all text-xs"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-secondary shrink-0" />
                        <span className="font-extrabold text-gray-900 dark:text-white truncate" title={item.cidade}>{item.cidade}</span>
                      </div>
                      {/* Costs listing */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-gray-500 dark:text-zinc-450 font-mono font-semibold">
                        <span>Transp: <span className="text-gray-900 dark:text-zinc-200">R${item.transporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                        <span>Func: <span className="text-gray-900 dark:text-zinc-200">R${item.funcionario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                        <span>DJ: <span className="text-gray-900 dark:text-zinc-200">R${item.dj.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Highlights sum cost */}
                      <div className="bg-primary/10 border border-primary/20 px-2 rounded-xl text-primary font-bold font-mono text-[10.5px] text-right">
                        <p className="text-[7.5px] uppercase tracking-wider text-primary/70 font-sans leading-none mb-0.5 font-bold">Custo Cidade</p>
                        <span>R$ {item.custo_cidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      {/* Dropdown / editing buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button; button"
                          onClick={() => openEditCityForm(idx)}
                          className="p-1 rounded-lg border border-gray-250 text-gray-550 hover:bg-gray-150 dark:border-zinc-750 dark:text-zinc-400 dark:hover:bg-zinc-850 transition-colors"
                          title="Editar"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button
                          type="button; button"
                          onClick={() => handleDeleteCity(idx)}
                          className="p-1 rounded-lg border border-red-100/60 text-red-500 hover:bg-red-50 dark:border-red-955/20 dark:hover:bg-red-950/20 transition-colors"
                          title="Excluir"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Logout button (Safe exit) */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          id="btn-logout"
          className="active-click flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-bold text-white transition-all hover:bg-secondary/90 shadow-md"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair (Logout)</span>
        </button>
      </div>

      {/* Professional Full Screen/Mobile Drawer Animated Overlay for Profile Editing */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto"
          >
            {/* Modal Body: Slide-up action in mobile, centered popup layout */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-900 sm:rounded-3xl max-h-[96vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-900">
                <div className="flex items-center gap-2">
                  <div className="h-8.5 w-8.5 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Editar Perfil</h3>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">Ajuste seus dados no Arthur Luz &amp; Som</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-150 dark:hover:bg-zinc-900 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Real-time interactive canvas-style Image Editor / Adjuster Subpanel */}
              {localImageSource && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="my-4 rounded-2xl border border-primary/25 bg-gray-50 p-4 dark:border-primary/20 dark:bg-zinc-900 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-primary" />
                        Ajuste de Imagem de Perfil
                      </h4>
                      <p className="text-[9px] text-gray-500 dark:text-zinc-400">Arraste a foto para centralizar e use os controles abaixo</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalImageSource(null)}
                      className="rounded-lg p-1 text-xs text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      Remover foto
                    </button>
                  </div>

                  {/* Circular mask with draggable panning image */}
                  <div className="flex justify-center py-2">
                    <div 
                      ref={previewContainerRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative h-44 w-44 rounded-full overflow-hidden border-2 border-primary bg-zinc-950 cursor-grab active:cursor-grabbing select-none"
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={localImageSource}
                        alt="Ajuste"
                        style={{
                          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                          filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                          transformOrigin: 'center center',
                          transition: isPanning ? 'none' : 'transform 0.15s ease-out, filter 0.1s ease-out'
                        }}
                        className="h-full w-full object-contain pointer-events-none"
                      />
                      {/* Grid representation target */}
                      <div className="absolute inset-0 border border-white/10 rounded-full pointer-events-none"></div>
                      <div className="absolute inset-x-0 top-1/2 h-[0.5px] bg-white/20 pointer-events-none"></div>
                      <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-white/20 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Controls sliders */}
                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600 dark:text-zinc-400">
                        <span>Aproximação (Zoom)</span>
                        <span>{zoom.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3.5" 
                        step="0.05"
                        value={zoom} 
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600 dark:text-zinc-400">
                        <span>Giro (Rotação)</span>
                        <span>{rotation}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        step="1"
                        value={rotation} 
                        onChange={(e) => setRotation(parseInt(e.target.value))}
                        className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600 dark:text-zinc-400">
                        <span>Brilho</span>
                        <span>{brightness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        step="1"
                        value={brightness} 
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600 dark:text-zinc-400">
                        <span>Contraste</span>
                        <span>{contrast}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        step="1"
                        value={contrast} 
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Apply action button */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLocalImageSource(null)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCropAndUpload}
                      disabled={isUploadingToCloudinary}
                      className="flex-1 py-2 rounded-xl bg-primary text-xs font-bold text-gray-950 hover:bg-primary/90 flex items-center justify-center gap-1.5"
                    >
                      {isUploadingToCloudinary ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Aplicar Ajustes</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                {profileError && (
                  <div className="rounded-xl bg-red-500/10 p-3 text-[11px] font-medium text-red-500 dark:bg-red-500/5">
                    {profileError}
                  </div>
                )}

                {/* Alterar foto section inside edit profile form */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Alterar foto de perfil
                  </label>

                  {/* Drag and Drop Zone with manual selector */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isDraggingOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 bg-gray-50/50 hover:border-primary/50 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-primary/30'
                    }`}
                  >
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="relative">
                      <img 
                        src={editAvatar} 
                        alt="Atual" 
                        className="h-16 w-16 rounded-full border-2 border-primary object-cover transition-transform group-hover:scale-105"
                        onError={() => setEditAvatar("https://cdn-icons-png.freepik.com/512/10100/10100139.png")}
                      />
                      <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-gray-950 shadow-sm">
                        <Camera className="h-3 w-3" />
                      </span>
                    </div>

                    <p className="text-xs font-bold text-gray-800 dark:text-zinc-300">
                      Upload ou Arrastar Foto
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Arraste uma foto aqui ou clique para selecionar. Salva direto no Cloudinary.
                    </p>
                  </div>

                  {/* Pre-configured Quick Choose Row */}
                  <div className="pt-1 select-none">
                    <p className="text-[9px] font-semibold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase">Ou escolha um avatar padrão:</p>
                    <div className="flex items-center gap-2">
                      {AVATAR_PRESETS.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setEditAvatar(preset);
                            setLocalImageSource(null);
                          }}
                          className={`relative rounded-full p-0.5 border-2 transition-all ${
                            editAvatar === preset ? 'border-primary scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img 
                            src={preset} 
                            alt={`Preset ${index}`} 
                            className="h-8.5 w-8.5 rounded-full object-cover" 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nome Completo (Required) */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                  />
                </div>

                {/* Telefone (Mascara (xx) xxxxx-xxxx) */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                    <Phone className="h-3.5 w-3.5 text-secondary" />
                    Telefone (opcional no cadastro)
                  </label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(formatPhone(e.target.value))}
                    placeholder="(xx) xxxxx-xxxx"
                    maxLength={15}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                  />
                </div>

                {/* Documento CPF */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400 font-sans">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    CPF (opcional)
                  </label>
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    placeholder="xxx.xxx.xxx-xx"
                    maxLength={14}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary font-mono"
                  />
                </div>

                {/* Endereço Residencial/Profissional */}
                <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-zinc-800/60">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">Localização & Endereço</span>
                  
                  {/* CEP Lookup Tool */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-zinc-800/60 dark:bg-zinc-950">
                    <p className="text-[10.5px] font-bold text-gray-600 dark:text-zinc-300 mb-2 flex items-center gap-1">
                      <Search className="h-3 w-3 text-secondary" />
                      Buscar Endereço por CEP (Autocomplemento)
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <div>
                        <label className="text-[9.5px] font-bold text-gray-400 dark:text-zinc-500">CEP</label>
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => setCep(formatCep(e.target.value))}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-bold text-gray-400 dark:text-zinc-500">Número</label>
                        <input
                          type="text"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="Ex: 123"
                          className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-bold text-gray-400 dark:text-zinc-500">Complemento</label>
                        <input
                          type="text"
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                          placeholder="Ex: Sala 4"
                          className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={isSearchingCep || !cep}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-gray-900 dark:text-white py-2 text-[11px] font-bold transition-colors disabled:opacity-40"
                    >
                      {isSearchingCep ? 'Buscando CEP...' : 'Preencher Endereço'}
                    </button>
                  </div>

                  {/* Complete Address Input */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Endereço Completo
                    </label>
                    <textarea
                      rows={2}
                      value={editEndereco}
                      onChange={(e) => setEditEndereco(e.target.value)}
                      placeholder="Busque pelo CEP acima ou digite aqui seu endereço completo (Rua, Número, Bairro, Cidade, Estado)"
                      className="w-full rounded-xl border border-gray-250 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-750 dark:bg-zinc-900 dark:text-white dark:focus:border-primary resize-none"
                    />
                  </div>
                </div>

                {/* E-mail (Disabled for stability, displayed clearly) */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    disabled
                    value={userProfile.email}
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 p-2.5 text-xs text-gray-500 outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 cursor-not-allowed font-medium"
                  />
                </div>

                {/* Nível de Acesso */}
                {userProfile.nivelAcesso === 'Administrador' && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                      <Shield className="h-3.5 w-3.5 text-secondary" />
                      Nível de Acesso
                    </label>
                    <select
                      value={editNivelAcesso}
                      onChange={(e) => setEditNivelAcesso(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-primary"
                    >
                      <option value="Equipe">Equipe</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="active-click flex-1 h-11 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile || isUploadingToCloudinary}
                    className="active-click flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-gray-950 transition-all hover:bg-primary/95 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <span className="animate-pulse">Salvando...</span>
                    ) : profileSaveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Salvo com sucesso!</span>
                      </>
                    ) : (
                      <span>Salvar Perfil</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
