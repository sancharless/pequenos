'use client';

import { useState, useEffect } from 'react';

type Tab = 'novo-pedido' | 'servicos' | 'adicionar-saldo' | 'pedidos' | 'api' | 'admin';
type AuthScreen = 'login' | 'register';

interface UserStats {
  name: string;
  email: string;
  balance: number;
  totalOrders: number;
  totalSpent: number;
  status: string;
  role?: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  ratePer1000: number;
  min: number;
  max: number;
  description: string;
}

interface Order {
  id: string;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'Pendente' | 'Processando' | 'Concluido' | 'Cancelado';
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  qrCodeBase64: string;
  qrCode: string;
  createdAt: string;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  
  // Auth Form inputs
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('novo-pedido');
  const [user, setUser] = useState<UserStats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for New Order
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [orderLink, setOrderLink] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(100);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFeedback, setOrderFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for Pix deposit
  const [depositAmount, setDepositAmount] = useState('15.00');
  const [generatedPix, setGeneratedPix] = useState<Payment | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixFeedback, setPixFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Admin Panel states
  const [adminUsers, setAdminUsers] = useState<UserStats[]>([]);
  const [markupPercent, setMarkupPercent] = useState<number>(20);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [adjustingUserEmail, setAdjustingUserEmail] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('10.00');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [isSavingMarkup, setIsSavingMarkup] = useState(false);

  // Check auth session
  useEffect(() => {
    const savedSession = sessionStorage.getItem('goobox_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Erro ao ler sessao:', err);
      }
    }
    setLoading(false);
  }, []);

  // Fetch initial SMM data after auth
  const fetchData = async () => {
    if (!isAuthenticated) return;
    try {
      const sessionUserStr = sessionStorage.getItem('goobox_session');
      const sessionUser = sessionUserStr ? JSON.parse(sessionUserStr) : null;
      const emailParam = sessionUser?.email ? `?email=${encodeURIComponent(sessionUser.email)}` : '';

      const [userRes, servicesRes, ordersRes] = await Promise.all([
        fetch(`/api/user${emailParam}`),
        fetch('/api/services'),
        fetch(`/api/orders${emailParam}`)
      ]);

      const userData = await userRes.json();
      const servicesData = await servicesRes.json();
      const ordersData = await ordersRes.json();

      // Merge current active session details if customized
      if (sessionUser) {
        setUser({
          ...userData,
          name: sessionUser.name,
          email: sessionUser.email,
          balance: sessionUser.balance, // use session storage to persist simulation balance
          role: sessionUser.role || userData.role || 'user'
        });
      } else {
        setUser(userData);
      }
      
      setServices(servicesData);
      setOrders(ordersData);

      if (servicesData.length > 0) {
        const categories = Array.from(new Set(servicesData.map((s: Service) => s.category))) as string[];
        setSelectedCategory(categories[0] || '');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const fetchAdminData = async () => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    setAdminLoading(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/settings')
      ]);
      if (usersRes.ok && settingsRes.ok) {
        const usersData = await usersRes.json();
        const settingsData = await settingsRes.json();
        setAdminUsers(usersData);
        setMarkupPercent(settingsData.serviceMarkupPercent);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do admin:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [activeTab, user]);

  const handleUpdateMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    setIsSavingMarkup(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceMarkupPercent: markupPercent })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminFeedback({ success: true, message: 'Margem de lucro atualizada!' });
        fetchData();
      } else {
        setAdminFeedback({ success: false, message: data.error || 'Erro ao atualizar margem.' });
      }
    } catch (err) {
      console.error(err);
      setAdminFeedback({ success: false, message: 'Erro de conexão.' });
    } finally {
      setIsSavingMarkup(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    if (!adjustingUserEmail) return;
    setIsAdjustingBalance(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adjustingUserEmail, amount: parseFloat(adjustmentAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminFeedback({ success: true, message: data.message || 'Saldo atualizado com sucesso!' });
        setAdjustmentAmount('10.00');
        fetchAdminData();
        if (user && adjustingUserEmail.toLowerCase() === user.email.toLowerCase()) {
          const updatedUser = { ...user, balance: user.balance + parseFloat(adjustmentAmount) };
          sessionStorage.setItem('goobox_session', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } else {
        setAdminFeedback({ success: false, message: data.error || 'Erro ao atualizar saldo.' });
      }
    } catch (err) {
      console.error(err);
      setAdminFeedback({ success: false, message: 'Erro de conexão.' });
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Update selected service when category or search changes
  useEffect(() => {
    if (services.length > 0 && selectedCategory) {
      const filtered = services.filter(s => s.category === selectedCategory);
      if (filtered.length > 0) {
        setSelectedServiceId(filtered[0].id);
      }
    }
  }, [selectedCategory, services]);

  // Calculate order price in real-time
  useEffect(() => {
    const service = services.find(s => s.id === selectedServiceId);
    if (service) {
      const price = (service.ratePer1000 / 1000) * orderQuantity;
      setCalculatedPrice(price);
    } else {
      setCalculatedPrice(0);
    }
  }, [selectedServiceId, orderQuantity, services]);

  // Handle Auth actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);

    if (!authEmail || !authPassword) {
      setAuthFeedback('Preencha todos os campos obrigatórios.');
      return;
    }

    if (authScreen === 'login') {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setAuthFeedback(data.error || 'Erro ao realizar login.');
          return;
        }

        sessionStorage.setItem('goobox_session', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error(err);
        setAuthFeedback('Erro de conexão ao realizar login.');
      }
    } else {
      if (!authName) {
        setAuthFeedback('Por favor, informe seu nome completo.');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
        });
        const data = await res.json();

        if (!res.ok) {
          setAuthFeedback(data.error || 'Erro ao criar conta.');
          return;
        }

        sessionStorage.setItem('goobox_session', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error(err);
        setAuthFeedback('Erro de conexão ao criar conta.');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('goobox_session');
    setIsAuthenticated(false);
    setUser(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
  };

  // Handle placing order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (!selectedServiceId || !orderLink || !orderQuantity) {
      setOrderFeedback({ success: false, message: 'Por favor, preencha todos os campos.' });
      return;
    }

    if (!user) return;

    if (user.balance < calculatedPrice) {
      setOrderFeedback({ success: false, message: 'Saldo insuficiente. Adicione saldo para continuar.' });
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          link: orderLink,
          quantity: orderQuantity,
          userEmail: user?.email
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setOrderFeedback({ success: false, message: data.error || 'Erro ao processar o pedido.' });
        return;
      }

      // Update session storage balance
      const newBalance = user.balance - calculatedPrice;
      const updatedUser: UserStats = {
        ...user,
        balance: newBalance,
        totalOrders: user.totalOrders + 1,
        totalSpent: user.totalSpent + calculatedPrice
      };
      sessionStorage.setItem('goobox_session', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setOrderFeedback({ success: true, message: 'Pedido realizado com sucesso!' });
      setOrderLink('');
      fetchData();
    } catch (err) {
      console.error(err);
      setOrderFeedback({ success: false, message: 'Ocorreu um erro de rede. Tente novamente.' });
    }
  };

  // Handle generating PIX recharge
  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setPixFeedback(null);
    setGeneratedPix(null);
    setPixLoading(true);

    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPixFeedback({ success: false, message: 'Insira um valor de depósito válido.' });
      setPixLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, userEmail: user?.email })
      });

      const data = await res.json();
      if (!res.ok) {
        setPixFeedback({ success: false, message: data.error || 'Erro ao gerar Pix.' });
        return;
      }

      setGeneratedPix(data.payment);
    } catch (err) {
      console.error(err);
      setPixFeedback({ success: false, message: 'Erro de conexão ao gerar pagamento.' });
    } finally {
      setPixLoading(false);
    }
  };

  // Simulate Mercado Pago webhook confirmation
  const handleSimulateWebhook = async () => {
    if (!generatedPix || !user) return;
    try {
      const res = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedPix.id,
          simulate: true
        })
      });

      if (res.ok) {
        setGeneratedPix(prev => prev ? { ...prev, status: 'approved' } : null);
        setPixFeedback({ success: true, message: 'Pagamento aprovado via simulação de webhook!' });
        
        // Add balance to current frontend session
        const newBalance = user.balance + generatedPix.amount;
        const updatedUser = { ...user, balance: newBalance };
        sessionStorage.setItem('goobox_session', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        fetchData();
      } else {
        const data = await res.json();
        setPixFeedback({ success: false, message: data.error || 'Erro na simulação.' });
      }
    } catch (err) {
      console.error(err);
      setPixFeedback({ success: false, message: 'Erro de rede na simulação.' });
    }
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const categories = Array.from(new Set(services.map(s => s.category)));

  const filteredServicesList = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' }}>
        <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600 }}>Carregando Goobox...</p>
      </div>
    );
  }

  // Render Login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-glow-1"></div>
        <div className="login-glow-2"></div>
        <div className="login-glow-3"></div>
        
        <div className="login-card-wrapper">
          <div className="login-card">
            <div className="login-logo-container">
              <div className="login-logo-circle">
                {/* Box Logo SVG */}
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="login-logo-text">Goobox</span>
              <p className="login-subtitle">
                {authScreen === 'login' ? 'Impulsione sua presença digital com o painel SMM do futuro.' : 'Crie sua conta em segundos para começar a impulsionar suas redes sociais!'}
              </p>
            </div>

            {authFeedback && (
              <div className="payment-status-banner pending" style={{ marginBottom: '20px', fontSize: '13px', justifyContent: 'center' }}>
                ⚠️ {authFeedback}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} autoComplete="off">
              {authScreen === 'register' && (
                <div className="login-input-group">
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="login-input-field"
                    placeholder="Seu nome completo"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="login-input-group">
                <label className="form-label">E-mail corporativo</label>
                <input
                  type="email"
                  className="login-input-field"
                  placeholder="exemplo@goobox.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="login-input-group">
                <label className="form-label">Senha de acesso</label>
                <input
                  type="password"
                  className="login-input-field"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="login-btn-premium">
                {authScreen === 'login' ? 'Entrar no Dashboard' : 'Começar Agora - Grátis'}
              </button>
            </form>

            <div className="login-toggle">
              {authScreen === 'login' ? (
                <>
                  Novo na Goobox? 
                  <span className="login-toggle-link" onClick={() => { setAuthScreen('register'); setAuthFeedback(null); }}>
                    Crie sua conta
                  </span>
                </>
              ) : (
                <>
                  Já tem cadastro? 
                  <span className="login-toggle-link" onClick={() => { setAuthScreen('login'); setAuthFeedback(null); }}>
                    Entrar
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className={`mobile-nav-item ${activeTab === 'novo-pedido' ? 'active' : ''}`} onClick={() => setActiveTab('novo-pedido')}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect width="7" height="9" x="3" y="3" rx="1"/>
            <rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/>
            <rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
          <span>Novo Pedido</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'servicos' ? 'active' : ''}`} onClick={() => setActiveTab('servicos')}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span>Serviços</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'adicionar-saldo' ? 'active' : ''}`} onClick={() => { setActiveTab('adicionar-saldo'); setGeneratedPix(null); setPixFeedback(null); }}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect width="20" height="14" x="2" y="5" rx="2"/>
            <line x1="2" x2="22" y1="10" y2="10"/>
          </svg>
          <span>Saldo</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
          <span>Pedidos</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
          <span>API</span>
        </div>
        {user?.role === 'admin' && (
          <div className={`mobile-nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span>Admin</span>
          </div>
        )}
      </nav>

      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="logo-section">
            {/* Box SVG logo */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6c25e2' }}>
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span className="logo-text">Goobox</span>
          </div>

          <ul className="menu-list">
            <li className={`menu-item ${activeTab === 'novo-pedido' ? 'active' : ''}`} onClick={() => setActiveTab('novo-pedido')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="7" height="9" x="3" y="3" rx="1"/>
                <rect width="7" height="5" x="14" y="3" rx="1"/>
                <rect width="7" height="9" x="14" y="12" rx="1"/>
                <rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
              <span>Novo Pedido</span>
            </li>
            <li className={`menu-item ${activeTab === 'servicos' ? 'active' : ''}`} onClick={() => setActiveTab('servicos')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>Serviços</span>
            </li>
            <li className={`menu-item ${activeTab === 'adicionar-saldo' ? 'active' : ''}`} onClick={() => { setActiveTab('adicionar-saldo'); setGeneratedPix(null); setPixFeedback(null); }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
              <span>Adicionar Saldo</span>
            </li>
            <li className={`menu-item ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              <span>Pedidos</span>
            </li>
            <li className={`menu-item ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
              <span>API Integração</span>
            </li>
            {user?.role === 'admin' && (
              <li className={`menu-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>Administrador</span>
              </li>
            )}
          </ul>
        </div>

        <div className="whatsapp-float" title="Suporte WhatsApp" onClick={() => window.open('https://wa.me/5511999999999', '_blank')}>
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.516 2.266 2.27 3.507 5.286 3.505 8.492-.005 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.887-6.978-1.864-1.868-4.343-2.899-6.984-2.9-5.439 0-9.865 4.422-9.869 9.86-.001 1.768.482 3.49 1.398 5.018l-.998 3.645 3.738-.981.014.009L6.647 19.15z"/>
          </svg>
        </div>
      </aside>

      {/* Main Content wrapper */}
      <main className="main-wrapper">
        {/* Header */}
        <header className="header-bar">
          <div className="header-welcome">
            <h1>Olá, {user?.name || 'Cliente'}</h1>
            <p>Bem-vindo à Goobox. Impulsione suas redes sociais instantaneamente!</p>
          </div>
          <div className="header-actions">
            <div className="icon-box" title={`Logado como: ${user?.email}`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div className="icon-box logout" title="Sair" onClick={handleLogout}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </div>
          </div>
        </header>

        {/* Widgets Panel */}
        <section className="widgets-grid">
          <div className="widget-card">
            <div className="widget-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
            </div>
            <div className="widget-info">
              <span className="widget-title">Total pedidos</span>
              <span className="widget-value">{user?.totalOrders.toLocaleString('pt-BR') || 0}</span>
            </div>
          </div>

          <div className="widget-card">
            <div className="widget-icon" style={{ color: '#00bfa5', backgroundColor: 'rgba(0, 191, 165, 0.15)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M16 11V7a4 4 0 00-8 0v4"/>
              </svg>
            </div>
            <div className="widget-info">
              <span className="widget-title">Seu saldo</span>
              <span className="widget-value" style={{ color: '#00bfa5' }}>
                R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 }) || '0,00'}
              </span>
            </div>
          </div>

          <div className="widget-card">
            <div className="widget-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div className="widget-info">
              <span className="widget-title">Total gasto</span>
              <span className="widget-value">R$ {user?.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
            </div>
          </div>

          <div className="widget-card">
            <div className="widget-icon" style={{ color: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.15)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="widget-info">
              <span className="widget-title">Status</span>
              <span className="widget-value" style={{ color: '#ffd700' }}>{user?.status || 'Membro'}</span>
            </div>
          </div>
        </section>

        {/* Dynamic Panels */}
        {activeTab === 'novo-pedido' && (
          <div className="content-split">
            {/* Left Order Form */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-header-icon">🛒</div>
                <div className="panel-header-info">
                  <h2>Faça um novo pedido</h2>
                  <p>Escolha o serviço desejado e crie sua campanha.</p>
                </div>
              </div>

              {orderFeedback && (
                <div className={`payment-status-banner ${orderFeedback.success ? 'approved' : 'pending'}`} style={{ marginBottom: '20px' }}>
                  {orderFeedback.message}
                </div>
              )}

              <form onSubmit={handlePlaceOrder}>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Serviço</label>
                  <select
                    className="form-select"
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                  >
                    {services
                      .filter(s => s.category === selectedCategory)
                      .map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link ou Usuário sem @</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://instagram.com/seu-perfil"
                    value={orderLink}
                    onChange={(e) => setOrderLink(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantidade</label>
                  <input
                    type="number"
                    className="form-input"
                    min={selectedService?.min || 10}
                    max={selectedService?.max || 10000}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Mínimo: {selectedService?.min || 10} | Máximo: {selectedService?.max || 10000}
                  </small>
                </div>

                <div className="price-display">
                  <span className="price-label">Preço Calculado</span>
                  <span className="price-value">R$ {calculatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
                </div>

                <button type="submit" className="submit-btn" disabled={!!(user && user.balance < calculatedPrice)}>
                  Fazer Pedido
                </button>
              </form>
            </div>

            {/* Right Info Description */}
            <div className="panel-card">
              <div className="panel-header secondary">
                <div className="panel-header-icon" style={{ backgroundColor: 'rgba(108, 37, 226, 0.1)' }}>💬</div>
                <div className="panel-header-info">
                  <h2>Leia a descrição</h2>
                  <p>Detalhes importantes sobre o serviço ativo</p>
                </div>
              </div>

              {selectedService ? (
                <div className="description-content">
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                    #{selectedService.id} - {selectedService.name.split(' - ')[0]}
                  </h3>
                  <p className="description-text">
                    {selectedService.description}
                  </p>
                  <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <p style={{ color: 'var(--success)', fontWeight: 600 }}>⚡ Início: Instantâneo / Rápido</p>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>💰 Custo por 1.000 unidades: R$ {selectedService.ratePer1000.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Nenhum serviço selecionado no momento.</p>
              )}

              <p className="terms-note">
                Quando você faz um pedido, considera-se que você aceitou os <span className="terms-link" onClick={() => alert('Termos de Uso')}>Termos de Uso</span>.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="panel-card">
            <div className="panel-header secondary" style={{ marginBottom: '16px' }}>
              <div className="panel-header-icon">📋</div>
              <div className="panel-header-info">
                <h2>Tabela de Serviços SMM</h2>
                <p>Veja e busque todos os serviços disponíveis e custos</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Digite para procurar serviços (ex: Instagram, TikTok)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="services-table-wrapper">
              <table className="smm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Categoria</th>
                    <th>Nome do Serviço</th>
                    <th>Preço por 1000</th>
                    <th>Mín / Máx</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServicesList.map((srv) => (
                    <tr key={srv.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>#{srv.id}</td>
                      <td><span className="badge processing" style={{ padding: '4px 8px', fontSize: '11px' }}>{srv.category}</span></td>
                      <td style={{ fontWeight: '500' }}>{srv.name.split(' - ')[0]}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>R$ {srv.ratePer1000.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{srv.min} / {srv.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'adicionar-saldo' && (
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-header-icon">💸</div>
              <div className="panel-header-info">
                <h2>Adicionar Saldo com Pix Mercado Pago</h2>
                <p>Reabasteça sua conta instantaneamente 24 horas por dia via Pix.</p>
              </div>
            </div>

            <div className="pix-container">
              {/* Form Input */}
              <div>
                <form onSubmit={handleGeneratePix}>
                  <div className="form-group">
                    <label className="form-label">Valor da Recarga (BRL)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: '18px', fontWeight: 'bold' }}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Min: R$ 1,00"
                      min="1.00"
                      step="0.01"
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn" disabled={pixLoading}>
                    {pixLoading ? 'Gerando QR Code...' : 'Gerar QR Code Pix'}
                  </button>
                </form>

                {pixFeedback && (
                  <div className="payment-status-banner pending" style={{ marginTop: '20px' }}>
                    {pixFeedback.message}
                  </div>
                )}
              </div>

              {/* QR Code / Copia e Cola Display */}
              {generatedPix && (
                <div className="pix-qr-box">
                  <p style={{ fontWeight: 'bold', fontSize: '15px' }}>Escaneie para pagar:</p>
                  <img src={generatedPix.qrCodeBase64} alt="QR Code Pix" className="pix-qr-img" />
                  
                  <div style={{ width: '100%' }}>
                    <p className="form-label" style={{ marginBottom: '6px' }}>Código Copia e Cola:</p>
                    <textarea 
                      readOnly 
                      className="form-input pix-code-textarea"
                      value={generatedPix.qrCode}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                  </div>

                  <button 
                    className="copy-btn" 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPix.qrCode);
                      alert('Código Pix copiado para a área de transferência!');
                    }}
                  >
                    Copiar Código Pix
                  </button>

                  {generatedPix.status === 'pending' ? (
                    <div className="payment-status-banner pending" style={{ width: '100%', justifyContent: 'center' }}>
                      <span className="badge pending">Aguardando pagamento...</span>
                      <button 
                        onClick={handleSimulateWebhook} 
                        style={{ marginLeft: '12px', background: '#ffd700', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#121218' }}
                      >
                        Simular Aprovação
                      </button>
                    </div>
                  ) : (
                    <div className="payment-status-banner approved" style={{ width: '100%', justifyContent: 'center' }}>
                      <span className="badge success">✓ Aprovado e Creditado!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div className="panel-card">
            <div className="panel-header secondary">
              <div className="panel-header-icon">📦</div>
              <div className="panel-header-info">
                <h2>Histórico de Pedidos</h2>
                <p>Acompanhe o andamento dos seus pedidos em tempo real</p>
              </div>
            </div>

            <div className="services-table-wrapper" style={{ marginTop: '20px' }}>
              <table className="smm-table">
                <thead>
                  <tr>
                    <th>ID Pedido</th>
                    <th>Serviço</th>
                    <th>Link</th>
                    <th>Quantidade</th>
                    <th>Valor Cobrado</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                        Nenhum pedido realizado ainda.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>#{ord.id}</td>
                        <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ord.serviceName}>
                          {ord.serviceName}
                        </td>
                        <td>
                          <a href={ord.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                            Acessar Link
                          </a>
                        </td>
                        <td>{ord.quantity}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                          R$ {ord.charge.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                        </td>
                        <td>
                          <span className={`badge ${ord.status === 'Concluido' ? 'success' : ord.status === 'Cancelado' ? 'error' : 'processing'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(ord.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="panel-card">
            <div className="panel-header secondary">
              <div className="panel-header-icon">⚙️</div>
              <div className="panel-header-info">
                <h2>API de Integração para Revendedores</h2>
                <p>Integre nosso painel SMM no seu próprio site ou subpainel</p>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>Informações Básicas</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                  Oferecemos suporte a APIs REST padrão compatíveis com a maioria dos painéis SMM do mercado. 
                  Você pode usar a URL abaixo para puxar nossa tabela de serviços e criar pedidos automaticamente.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                <p className="form-label" style={{ marginBottom: '6px' }}>Endpoint da API SMM:</p>
                <code style={{ color: '#00bfa5', fontSize: '14px', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/services` : 'https://gooboxsmm.com/api/services'}
                </code>
              </div>

              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>Token de API (Key)</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="password" 
                    readOnly 
                    className="form-input" 
                    style={{ flexGrow: 1, fontFamily: 'monospace' }} 
                    value="gb_5c16c524cb4217bc45e6a8da6238743"
                  />
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText("gb_5c16c524cb4217bc45e6a8da6238743");
                      alert('Chave de API copiada!');
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && user?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="content-split">
              {/* Markup settings card */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-header-icon">📈</div>
                  <div className="panel-header-info">
                    <h2>Margem de Lucro dos Serviços</h2>
                    <p>Defina a porcentagem de lucro cobrada acima do fornecedor</p>
                  </div>
                </div>

                {adminFeedback && adminFeedback.message.includes('Margem') && (
                  <div className={`payment-status-banner ${adminFeedback.success ? 'approved' : 'pending'}`} style={{ marginBottom: '20px' }}>
                    {adminFeedback.message}
                  </div>
                )}

                <form onSubmit={handleUpdateMarkup}>
                  <div className="form-group">
                    <label className="form-label">Markup Global (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: '18px', fontWeight: 'bold' }}
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="500"
                      step="1"
                      required
                    />
                    <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Exemplo: 20% de markup transformará um custo de fornecedor de R$ 5,00 em R$ 6,00 para os clientes.
                    </small>
                  </div>
                  <button type="submit" className="submit-btn" disabled={isSavingMarkup}>
                    {isSavingMarkup ? 'Salvando...' : 'Salvar Margem de Lucro'}
                  </button>
                </form>
              </div>

              {/* Quick balance adjustment card */}
              <div className="panel-card">
                <div className="panel-header secondary">
                  <div className="panel-header-icon" style={{ backgroundColor: 'rgba(0, 191, 165, 0.15)', color: 'var(--success)' }}>💰</div>
                  <div className="panel-header-info">
                    <h2>Adicionar / Retirar Saldo</h2>
                    <p>Ajuste o saldo de qualquer usuário na plataforma</p>
                  </div>
                </div>

                {adminFeedback && adminFeedback.message.includes('Saldo') && (
                  <div className={`payment-status-banner ${adminFeedback.success ? 'approved' : 'pending'}`} style={{ marginBottom: '20px' }}>
                    {adminFeedback.message}
                  </div>
                )}

                <form onSubmit={handleAdjustBalance}>
                  <div className="form-group">
                    <label className="form-label">Selecionar Usuário</label>
                    <select
                      className="form-select"
                      value={adjustingUserEmail}
                      onChange={(e) => setAdjustingUserEmail(e.target.value)}
                      required
                    >
                      <option value="">Selecione um usuário...</option>
                      {adminUsers.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.name} ({u.email}) - Saldo: R$ {u.balance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor do Ajuste (BRL)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontFamily: 'monospace' }}
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                      placeholder="Ex: 50.00 ou -20.00"
                      step="0.01"
                      required
                    />
                    <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Valores positivos adicionam saldo. Valores negativos subtraem saldo.
                    </small>
                  </div>

                  <button type="submit" className="submit-btn" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #00897b 100%)', boxShadow: '0 4px 15px rgba(0, 191, 165, 0.2)' }} disabled={isAdjustingBalance || !adjustingUserEmail}>
                    {isAdjustingBalance ? 'Processando...' : 'Aplicar Ajuste de Saldo'}
                  </button>
                </form>
              </div>
            </div>

            {/* Users table card */}
            <div className="panel-card">
              <div className="panel-header secondary">
                <div className="panel-header-icon">👥</div>
                <div className="panel-header-info">
                  <h2>Usuários Cadastrados</h2>
                  <p>Visualize e administre as contas e dados de uso dos clientes</p>
                </div>
              </div>

              {adminLoading ? (
                <p style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>Buscando dados de usuários...</p>
              ) : (
                <div className="services-table-wrapper" style={{ marginTop: '20px' }}>
                  <table className="smm-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Status</th>
                        <th>Função</th>
                        <th>Saldo</th>
                        <th>Pedidos Realizados</th>
                        <th>Total Gasto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                            Nenhum usuário cadastrado.
                          </td>
                        </tr>
                      ) : (
                        adminUsers.map((u) => (
                          <tr key={u.email}>
                            <td style={{ fontWeight: '600' }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className="badge processing" style={{ textTransform: 'capitalize' }}>{u.status}</span>
                            </td>
                            <td>
                              <span className="badge" style={{ 
                                backgroundColor: u.role === 'admin' ? 'rgba(255, 51, 102, 0.15)' : 'rgba(108, 37, 226, 0.15)',
                                color: u.role === 'admin' ? 'var(--error)' : 'var(--primary)'
                              }}>
                                {u.role === 'admin' ? 'Administrador' : 'Cliente'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                              R$ {u.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                            </td>
                            <td>{u.totalOrders}</td>
                            <td>R$ {u.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
