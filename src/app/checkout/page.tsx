'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartItem } from '@/components/StoreFront';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingFee, setShippingFee] = useState<number>(15.00);
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({
    shippingFee: 15.00,
    shippingFeeLocal: 10.00,
    shippingFeeOthers: 25.00,
    shippingFreeThreshold: 199.00,
    storeState: 'PE'
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'PE', // Default state
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + shippingFee;

  useEffect(() => {
    // Load cart
    const savedCart = localStorage.getItem('pequenos_estilosos_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        if (parsed.length === 0) {
          router.push('/');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      router.push('/');
    }

    // Load settings (shipping rules, whatsapp)
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.shippingFee !== undefined) setShippingFee(Number(data.shippingFee));
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
        setShippingSettings({
          shippingFee: Number(data.shippingFee !== undefined ? data.shippingFee : 15),
          shippingFeeLocal: Number(data.shippingFeeLocal !== undefined ? data.shippingFeeLocal : 10),
          shippingFeeOthers: Number(data.shippingFeeOthers !== undefined ? data.shippingFeeOthers : 25),
          shippingFreeThreshold: Number(data.shippingFreeThreshold !== undefined ? data.shippingFreeThreshold : 199),
          storeState: data.storeState || 'PE'
        });
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, [router]);

  // Recalculate shipping fee automatically based on subtotal and target state
  useEffect(() => {
    if (!shippingSettings) return;

    let fee = shippingSettings.shippingFee;
    const isFree = shippingSettings.shippingFreeThreshold > 0 && subtotal >= shippingSettings.shippingFreeThreshold;

    if (isFree) {
      fee = 0;
    } else if (formData.state) {
      if (formData.state.toUpperCase() === shippingSettings.storeState.toUpperCase()) {
        fee = shippingSettings.shippingFeeLocal;
      } else {
        fee = shippingSettings.shippingFeeOthers;
      }
    }

    setShippingFee(fee);
  }, [formData.state, subtotal, shippingSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleZipCodeBlur = async () => {
    const cleanedZip = formData.zipCode.replace(/\D/g, '');
    if (cleanedZip.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanedZip}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching address from ViaCEP:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.zipCode || !formData.street || !formData.number || !formData.neighborhood || !formData.city) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: {
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          items: cart,
          totalAmount: total
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear local cart
        localStorage.removeItem('pequenos_estilosos_cart');
        // Redirect to order page
        router.push(`/order/${data.orderId}`);
      } else {
        alert(data.error || 'Erro ao processar pedido. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao processar checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col min-h-screen bg-light">
      {/* Header */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo-link">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="#FFF2F7" stroke="#E5207B" strokeWidth="4"/>
              <path d="M35 45C35 36.7157 41.7157 30 50 30C58.2843 30 65 36.7157 65 45C65 53.2843 58.2843 60 50 60C41.7157 60 35 53.2843 35 45Z" fill="#FFF"/>
              <path d="M43 43C43 41.8954 43.8954 41 45 41C46.1046 41 47 41.8954 47 43C47 44.1046 46.1046 45 45 45C43.8954 45 43 44.1046 43 43Z" fill="#1F2937"/>
              <path d="M53 43C53 41.8954 53.8954 41 55 41C56.1046 41 57 41.8954 57 43C57 44.1046 56.1046 45 55 45C53.8954 45 53 44.1046 53 43Z" fill="#1F2937"/>
              <path d="M45 52C47.5 54.5 52.5 54.5 55 52" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
              <rect x="25" y="15" width="22" height="12" rx="6" transform="rotate(-15 25 15)" fill="#0CA5C4"/>
              <rect x="62" y="20" width="22" height="12" rx="6" transform="rotate(15 62 20)" fill="#E5207B"/>
              <circle cx="50" cy="18" r="7" fill="#F4D03F"/>
            </svg>
            <span className="logo-text">Pequenos Estilosos</span>
          </Link>
          <span style={{ fontWeight: '600', color: 'var(--text-medium)' }}>Checkout</span>
        </div>
      </header>

      {/* Main Checkout Grid */}
      <main className="container" style={{ flexGrow: 1, padding: '30px 20px' }}>
        <form onSubmit={handleSubmit} className="checkout-layout">
          {/* Left Column: Form Details */}
          <div className="flex-col">
            {/* Customer Details */}
            <div className="checkout-card">
              <h2 className="checkout-section-title">
                <span>1</span> Identificação
              </h2>
              
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Maria Souza" 
                  className="form-input" 
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">E-mail *</label>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="mari@exemplo.com" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    required 
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(81) 99999-9999" 
                    className="form-input" 
                  />
                </div>
              </div>
            </div>

            {/* Shipping Details */}
            <div className="checkout-card">
              <h2 className="checkout-section-title">
                <span>2</span> Endereço de Entrega
              </h2>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">CEP *</label>
                  <input 
                    type="text" 
                    name="zipCode" 
                    required 
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    onBlur={handleZipCodeBlur}
                    placeholder="Ex: 50000-000" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rua / Logradouro *</label>
                  <input 
                    type="text" 
                    name="street" 
                    required 
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Rua das Flores" 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Número *</label>
                  <input 
                    type="text" 
                    name="number" 
                    required 
                    value={formData.number}
                    onChange={handleInputChange}
                    placeholder="123" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Complemento</label>
                  <input 
                    type="text" 
                    name="complement" 
                    value={formData.complement}
                    onChange={handleInputChange}
                    placeholder="Apto 102, Bloco B" 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Bairro *</label>
                  <input 
                    type="text" 
                    name="neighborhood" 
                    required 
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    placeholder="Centro" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Cidade *</label>
                    <input 
                      type="text" 
                      name="city" 
                      required 
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Recife" 
                      className="form-input" 
                    />
                  </div>
                  <div>
                    <label className="form-label">UF *</label>
                    <select 
                      name="state" 
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-input"
                      style={{ padding: '12px 10px', appearance: 'none' }}
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="checkout-card">
              <h2 className="checkout-section-title">
                <span>3</span> Forma de Pagamento
              </h2>

              <div className="payment-options-grid">
                <div className="payment-option-card active">
                  <div className="payment-option-icon">⚡</div>
                  <div className="payment-option-title">PIX (Mercado Pago)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-medium)', textAlign: 'center' }}>
                    Aprovação imediata. QR Code gerado no final.
                  </div>
                </div>
                
                <div className="payment-option-card" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  <div className="payment-option-icon">💳</div>
                  <div className="payment-option-title">Cartão de Crédito</div>
                  <span className="size-tag" style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--border-dark)', fontSize: '9px' }}>Em breve</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-medium)', textAlign: 'center' }}>
                    Pague parcelado com segurança pelo Mercado Pago.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div>
            <div className="summary-card">
              <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                Resumo do Pedido
              </h3>

              <div className="summary-items-list">
                {cart.map((item, idx) => (
                  <div key={`${item.productId}-${item.size}-${idx}`} className="summary-item">
                    {item.image && item.image !== '/images/placeholder-vestido.jpg' && item.image !== '/images/placeholder-moletom.jpg' && item.image !== '/images/placeholder-jardineira.jpg' && item.image !== '/images/placeholder-body.jpg' ? (
                      <img src={item.image} alt={item.name} className="summary-item-img" />
                    ) : (
                      <div className="summary-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)', border: '1px solid var(--border-dark)' }}>
                        👕
                      </div>
                    )}
                    <div className="summary-item-details">
                      <div className="summary-item-name">{item.name}</div>
                      <div className="summary-item-meta">Tam: {item.size} | Qtd: {item.quantity}</div>
                    </div>
                    <div className="summary-item-price">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-calc-list">
                <div className="summary-calc-row">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="summary-calc-row">
                  <span>{
                    shippingSettings.shippingFreeThreshold > 0 && subtotal >= shippingSettings.shippingFreeThreshold
                      ? 'Frete Grátis'
                      : formData.state.toUpperCase() === shippingSettings.storeState.toUpperCase()
                        ? `Frete Local (${formData.state})`
                        : `Frete Nacional (${formData.state})`
                  }</span>
                  <span>
                    {shippingFee === 0 ? (
                      <strong style={{ color: 'var(--success)' }}>Grátis</strong>
                    ) : (
                      `R$ ${shippingFee.toFixed(2).replace('.', ',')}`
                    )}
                  </span>
                </div>
                <div className="summary-calc-row total">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || cart.length === 0} 
                className="btn btn-primary btn-block"
                style={{ height: '52px' }}
              >
                {loading ? 'Processando Pedido...' : `Finalizar Pedido (R$ ${total.toFixed(2).replace('.', ',')})`}
              </button>
              
              <Link href="/" className="btn btn-secondary btn-block" style={{ marginTop: '8px', border: 'none' }}>
                Alterar sacola de compras
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
