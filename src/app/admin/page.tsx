'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Bebê' | 'Menino' | 'Menina' | 'Acessórios';
  sizes: string[];
  images: string[];
  stock: number;
  featured: boolean;
}

interface EcommerceOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size: string;
    image: string;
  }[];
  totalAmount: number;
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentId?: string;
  createdAt: string;
}

interface EcommerceSettings {
  whatsappNumber: string;
  instagramUrl: string;
  mercadoPagoToken: string;
  shippingFee: number;
  shippingFeeLocal: number;
  shippingFeeOthers: number;
  shippingFreeThreshold: number;
  storeState: string;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'settings'>('dashboard');

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [settings, setSettings] = useState<EcommerceSettings>({
    whatsappNumber: '',
    instagramUrl: '',
    mercadoPagoToken: '',
    shippingFee: 0,
    shippingFeeLocal: 0,
    shippingFeeOthers: 0,
    shippingFreeThreshold: 0,
    storeState: 'PE'
  });

  // Loading States
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Modals / Product Forms
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Menina' as Product['category'],
    sizes: [] as string[],
    images: [] as string[],
    stock: '',
    featured: false
  });

  // Check login on mount
  useEffect(() => {
    const adminSession = sessionStorage.getItem('pequenos_estilosos_admin');
    if (adminSession === 'true') {
      setIsLoggedIn(true);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoadingProducts(true);
    setLoadingOrders(true);
    setLoadingSettings(true);

    try {
      const prodRes = await fetch('/api/admin/products');
      if (prodRes.ok) setProducts(await prodRes.json());

      const orderRes = await fetch('/api/admin/orders');
      if (orderRes.ok) setOrders(await orderRes.json());

      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingProducts(false);
      setLoadingOrders(false);
      setLoadingSettings(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('pequenos_estilosos_admin', 'true');
        setIsLoggedIn(true);
        fetchData();
      } else {
        setLoginError(data.error || 'Credenciais incorretas.');
      }
    } catch (err) {
      setLoginError('Erro de rede ao conectar.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pequenos_estilosos_admin');
    setIsLoggedIn(false);
  };

  // Image base64 handler for multiple uploads
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const loadPromises = Array.from(files).map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      try {
        const base64Strings = await Promise.all(loadPromises);
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, ...base64Strings]
        }));
      } catch (err) {
        console.error('Erro ao ler arquivos de imagem:', err);
        alert('Erro ao carregar uma ou mais imagens.');
      }
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const url = imageUrlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      alert('Por favor, insira uma URL válida (começando com http://, https:// ou /)');
      return;
    }
    setProductForm(prev => ({
      ...prev,
      images: [...prev.images, url]
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setProductForm(prev => {
      const nextImages = [...prev.images];
      nextImages.splice(index, 1);
      return { ...prev, images: nextImages };
    });
  };

  const handleSetCover = (index: number) => {
    setProductForm(prev => {
      if (index <= 0 || index >= prev.images.length) return prev;
      const nextImages = [...prev.images];
      const target = nextImages[index];
      nextImages.splice(index, 1); // remove from current index
      nextImages.unshift(target); // prepend to beginning
      return { ...prev, images: nextImages };
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setProductForm(prev => {
      const nextImages = [...prev.images];
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= nextImages.length) return prev;
      
      const temp = nextImages[index];
      nextImages[index] = nextImages[newIndex];
      nextImages[newIndex] = temp;
      
      return { ...prev, images: nextImages };
    });
  };

  const handleSizeToggle = (size: string) => {
    setProductForm(prev => {
      const current = [...prev.sizes];
      const idx = current.indexOf(size);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(size);
      }
      return { ...prev, sizes: current };
    });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setImageUrlInput('');
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: 'Menina',
      sizes: ['P', 'M', 'G'], // pre-selected default sizes
      images: [],
      stock: '10',
      featured: false
    });
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setImageUrlInput('');
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      sizes: product.sizes,
      images: product.images || [],
      stock: String(product.stock),
      featured: product.featured
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.sizes.length) {
      alert('Por favor, preencha nome, preço e tamanhos.');
      return;
    }
    if (!productForm.images || !productForm.images.length) {
      alert('Por favor, adicione pelo menos uma imagem (foto) para o produto.');
      return;
    }

    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock || 0)
    };

    try {
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar produto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente deletar esta peça de roupa?')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao deletar produto.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: EcommerceOrder['paymentStatus']) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao atualizar status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Configurações atualizadas com sucesso!');
        fetchData();
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations for dashboard
  const approvedOrders = orders.filter(o => o.paymentStatus === 'approved');
  const totalSales = approvedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrders = orders.filter(o => o.paymentStatus === 'pending');

  if (!isLoggedIn) {
    // Login Screen
    return (
      <div className="flex-col min-h-screen bg-light" style={{ justifyContent: 'center' }}>
        <div className="admin-login-card">
          <div className="admin-header-logo">
            🧸 Pequenos Estilosos Admin
          </div>
          
          <form onSubmit={handleLogin} className="flex-col">
            {loginError && (
              <div style={{ background: 'var(--error-soft)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
                {loginError}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">E-mail Administrativo</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="admin@pequenosestilosos.com.br" 
                className="form-input" 
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                className="form-input" 
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ height: '48px' }}>
              Entrar no Painel
            </button>
            
            <Link href="/" className="btn btn-secondary btn-block" style={{ marginTop: '8px', border: 'none' }}>
              Ir para Loja Pública
            </Link>
          </form>
          
          <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-light)', textAlign: 'center' }}>
            Acesso administrativo padrão:<br />
            <strong>admin@pequenosestilosos.com.br</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Area
  return (
    <div className="admin-page-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-nav">
        <div style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: '800', color: 'var(--primary)', marginBottom: '32px', textAlign: 'center' }}>
          ✨ Estilosos Admin
        </div>

        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
        >
          📊 Dashboard
        </button>
        
        <button 
          onClick={() => setActiveTab('products')} 
          className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
        >
          👗 Roupas / Peças
        </button>
        
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
        >
          📦 Pedidos
          {pendingOrders.length > 0 && (
            <span className="badge-count" style={{ position: 'static', marginLeft: 'auto' }}>
              {pendingOrders.length}
            </span>
          )}
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
        >
          ⚙️ Configurações
        </button>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary btn-block btn-sm"
          >
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="admin-main">
        {activeTab === 'dashboard' && (
          <div>
            <div className="admin-header-row">
              <h1 className="admin-title">Visão Geral</h1>
              <button onClick={fetchData} className="btn btn-secondary btn-sm">Atualizar Dados</button>
            </div>

            {/* Metrics */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-title">Faturamento Total</div>
                <div className="stat-card-val" style={{ color: 'var(--success)' }}>
                  R$ {totalSales.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Vendas Aprovadas</div>
                <div className="stat-card-val">{approvedOrders.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Aguardando PIX</div>
                <div className="stat-card-val" style={{ color: 'var(--warning)' }}>{pendingOrders.length}</div>
              </div>
            </div>

            {/* Latest Orders */}
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Últimos Pedidos Recebidos</h2>
            <div className="admin-table-card" style={{ marginBottom: '40px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID Pedido</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: '700' }}>#{ord.id}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{ord.customerPhone}</div>
                      </td>
                      <td>R$ {ord.totalAmount.toFixed(2).replace('.', ',')}</td>
                      <td>
                        <span className={`badge badge-${ord.paymentStatus}`}>
                          {ord.paymentStatus === 'approved' ? 'Aprovado' : ord.paymentStatus === 'pending' ? 'Pendente' : ord.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {ord.paymentStatus === 'pending' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord.id, 'approved')} 
                              className="btn btn-primary btn-sm" 
                              style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'unset', background: 'var(--success)' }}
                              title="Simular Pagamento do Cliente via PIX"
                            >
                              ⚡ Simular Pix
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              alert(`Endereço de envio:\n${ord.customerAddress.street}, nº ${ord.customerAddress.number} - ${ord.customerAddress.neighborhood}\n${ord.customerAddress.city}-${ord.customerAddress.state}\nCEP: ${ord.customerAddress.zipCode}\n\nItens:\n${ord.items.map(i => `- ${i.name} (Tamanho: ${i.size}) x${i.quantity}`).join('\n')}`);
                            }} 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'unset' }}
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-medium)' }}>
                        Nenhum pedido recebido ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="admin-header-row">
              <h1 className="admin-title">Gerenciador de Roupas</h1>
              <button onClick={openAddModal} className="btn btn-primary">Adicionar Nova Peça</button>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagem</th>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>Tamanhos</th>
                    <th>Estoque</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        {prod.images && prod.images[0] && prod.images[0] !== '/images/placeholder-vestido.jpg' && prod.images[0] !== '/images/placeholder-moletom.jpg' && prod.images[0] !== '/images/placeholder-jardineira.jpg' && prod.images[0] !== '/images/placeholder-body.jpg' ? (
                          <img src={prod.images[0]} alt={prod.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '18px' }}>👕</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{prod.name}</div>
                        {prod.featured && <span className="size-tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: 'none', padding: '1px 4px', fontSize: '9px' }}>Destaque</span>}
                      </td>
                      <td>{prod.category}</td>
                      <td style={{ fontWeight: '700' }}>R$ {prod.price.toFixed(2).replace('.', ',')}</td>
                      <td>
                        <div className="flex gap-1 wrap">
                          {prod.sizes.map(s => <span key={s} className="size-tag" style={{ fontSize: '10px' }}>{s}</span>)}
                        </div>
                      </td>
                      <td>{prod.stock} un</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(prod)} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', minHeight: 'unset' }}>Editar</button>
                          <button onClick={() => handleDeleteProduct(prod.id)} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', minHeight: 'unset', color: 'var(--error)' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-medium)' }}>
                        Nenhuma peça de roupa infantil cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="admin-header-row">
              <h1 className="admin-title">Gerenciador de Pedidos</h1>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID Pedido</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: '700' }}>#{ord.id}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-medium)' }}>{new Date(ord.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-medium)' }}>{ord.customerPhone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{ord.customerEmail}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-medium)' }}>
                          {ord.items.map((it, idx) => (
                            <div key={idx}>- {it.name} (Tamanho: {it.size}) x{it.quantity}</div>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: '700' }}>R$ {ord.totalAmount.toFixed(2).replace('.', ',')}</td>
                      <td>
                        <span className={`badge badge-${ord.paymentStatus}`}>
                          {ord.paymentStatus === 'approved' ? 'Aprovado' : ord.paymentStatus === 'pending' ? 'Pendente' : ord.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1" style={{ flexDirection: 'column' }}>
                          {ord.paymentStatus === 'pending' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord.id, 'approved')} 
                              className="btn btn-primary btn-sm btn-block" 
                              style={{ padding: '6px 12px', minHeight: 'unset', background: 'var(--success)', fontSize: '12px' }}
                            >
                              ✓ Aprovar Pix
                            </button>
                          )}
                          
                          <button 
                            onClick={() => {
                              alert(`Endereço Completo de Envio:\n\nCEP: ${ord.customerAddress.zipCode}\nEndereço: ${ord.customerAddress.street}, nº ${ord.customerAddress.number}\nComplemento: ${ord.customerAddress.complement || 'Não informado'}\nBairro: ${ord.customerAddress.neighborhood}\nCidade: ${ord.customerAddress.city} - ${ord.customerAddress.state}`);
                            }} 
                            className="btn btn-secondary btn-sm btn-block" 
                            style={{ padding: '6px 12px', minHeight: 'unset', fontSize: '12px' }}
                          >
                            Ver Endereço
                          </button>
                          
                          {ord.paymentStatus !== 'cancelled' && ord.paymentStatus !== 'approved' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled')} 
                              className="btn btn-secondary btn-sm btn-block" 
                              style={{ padding: '6px 12px', minHeight: 'unset', color: 'var(--error)', fontSize: '12px' }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-medium)' }}>
                        Nenhum pedido recebido ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="admin-header-row">
              <h1 className="admin-title">Configurações da Loja</h1>
            </div>

            <div className="checkout-card" style={{ maxWidth: '600px' }}>
              <form onSubmit={handleSaveSettings} className="flex-col">
                <div className="form-group">
                  <label className="form-label">WhatsApp da Loja (com DDD - somente números) *</label>
                  <input 
                    type="text" 
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                    required
                    placeholder="Ex: 5581999999999" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Link do Perfil do Instagram *</label>
                  <input 
                    type="url" 
                    value={settings.instagramUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    required
                    placeholder="https://instagram.com/sualoja" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mercado Pago Access Token (Sandbox ou Produção)</label>
                  <input 
                    type="password" 
                    value={settings.mercadoPagoToken}
                    onChange={(e) => setSettings(prev => ({ ...prev, mercadoPagoToken: e.target.value }))}
                    placeholder="APP_USR-..." 
                    className="form-input" 
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                    Deixe em branco para usar o **modo simulação**. O e-commerce gerará PIX simulado funcional para testes rápidos!
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Estado de Origem (UF da Loja) *</label>
                    <select 
                      value={settings.storeState || 'PE'}
                      onChange={(e) => setSettings(prev => ({ ...prev, storeState: e.target.value }))}
                      required
                      className="form-input"
                      style={{ padding: '12px 10px' }}
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Mínimo para Frete Grátis (R$ - 0 para desativar) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={settings.shippingFreeThreshold || 0}
                      onChange={(e) => setSettings(prev => ({ ...prev, shippingFreeThreshold: Number(e.target.value) }))}
                      required
                      placeholder="Ex: 199.90"
                      className="form-input" 
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Frete Local (Mesmo Estado) (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={settings.shippingFeeLocal || 0}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        shippingFeeLocal: Number(e.target.value),
                        shippingFee: Number(e.target.value) // Sync with main shipping fee for backwards compatibility
                      }))}
                      required
                      placeholder="Ex: 10.00"
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Frete Nacional (Outros Estados) (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={settings.shippingFeeOthers || 0}
                      onChange={(e) => setSettings(prev => ({ ...prev, shippingFeeOthers: Number(e.target.value) }))}
                      required
                      placeholder="Ex: 25.00"
                      className="form-input" 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
                  Salvar Configurações
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Product ADD/EDIT Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>
                {editingProduct ? 'Editar Peça' : 'Cadastrar Peça de Roupa'}
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome da Peça *</label>
                  <input 
                    type="text" 
                    value={productForm.name} 
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))} 
                    required 
                    placeholder="Ex: Conjunto Romper de Linho" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição / Detalhes *</label>
                  <textarea 
                    value={productForm.description} 
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))} 
                    placeholder="Detalhes sobre o tecido, caimento..." 
                    className="form-input" 
                    style={{ minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Preço (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={productForm.price} 
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))} 
                      required 
                      placeholder="89.90" 
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select 
                      value={productForm.category} 
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value as Product['category'] }))} 
                      className="form-input"
                    >
                      <option value="Menina">Menina</option>
                      <option value="Menino">Menino</option>
                      <option value="Bebê">Bebê</option>
                      <option value="Acessórios">Acessórios</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Quantidade em Estoque *</label>
                    <input 
                      type="number" 
                      value={productForm.stock} 
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))} 
                      required 
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'center', paddingLeft: '10px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={productForm.featured} 
                        onChange={(e) => setProductForm(prev => ({ ...prev, featured: e.target.checked }))} 
                        style={{ width: '18px', height: '18px' }}
                      />
                      Destacar na vitrine
                    </label>
                  </div>
                </div>

                {/* Size Checklist */}
                <div className="form-group">
                  <label className="form-label">Tamanhos Disponíveis (Selecione) *</label>
                  <div className="size-select-list">
                    {['RN', 'P', 'M', 'G', 'GG', '1', '2', '3', '4', '6', '8', '10', '12'].map((sz) => {
                      const isSelected = productForm.sizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          className={`size-btn ${isSelected ? 'active' : ''}`}
                          style={{ height: '40px', minWidth: '40px' }}
                          onClick={() => handleSizeToggle(sz)}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image Upload and Gallery Management */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Fotos do Produto *</label>
                  
                  {/* File Upload (Multiple) */}
                  <input 
                    type="file" 
                    multiple
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="form-input" 
                    style={{ padding: '8px', marginBottom: '8px' }}
                  />

                  {/* Add Image by URL */}
                  <div className="image-add-url-row">
                    <input
                      type="text"
                      placeholder="Ou cole a URL de uma imagem pública..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="form-input"
                      style={{ flexGrow: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: 'unset', whiteSpace: 'nowrap' }}
                    >
                      + Link
                    </button>
                  </div>

                  {/* Previews Grid */}
                  {productForm.images && productForm.images.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <span className="form-label" style={{ fontSize: '12px', color: 'var(--text-medium)' }}>
                        Galeria de Fotos ({productForm.images.length} {productForm.images.length === 1 ? 'foto' : 'fotos'}) - A primeira será a Capa:
                      </span>
                      
                      <div className="images-grid">
                        {productForm.images.map((img, idx) => (
                          <div key={idx} className="image-preview-card">
                            <img src={img} alt={`Preview ${idx + 1}`} />
                            
                            {/* Badges */}
                            {idx === 0 ? (
                              <span className="image-badge">★ Capa</span>
                            ) : (
                              <span className="image-badge-secondary">{idx + 1}</span>
                            )}
                            
                            {/* Actions Overlay */}
                            <div className="image-actions-overlay">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  title="Definir como Capa"
                                  onClick={() => handleSetCover(idx)}
                                  className="image-action-btn"
                                  style={{ marginBottom: '4px' }}
                                >
                                  Capa
                                </button>
                              )}
                              
                              <div className="image-action-btn-row">
                                <button
                                  type="button"
                                  title="Mover para Esquerda"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveImage(idx, 'left')}
                                  className="image-action-btn-small"
                                  style={{ opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  title="Mover para Direita"
                                  disabled={idx === productForm.images.length - 1}
                                  onClick={() => handleMoveImage(idx, 'right')}
                                  className="image-action-btn-small"
                                  style={{ opacity: idx === productForm.images.length - 1 ? 0.4 : 1, cursor: idx === productForm.images.length - 1 ? 'not-allowed' : 'pointer' }}
                                >
                                  →
                                </button>
                                <button
                                  type="button"
                                  title="Excluir Imagem"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="image-action-btn-small image-action-delete"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)} 
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Salvar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
