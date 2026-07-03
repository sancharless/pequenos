'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, EcommerceSettings } from '@/lib/db';
import { CartItem } from './StoreFront';

interface ProductDetailProps {
  product: Product;
  settings: EcommerceSettings;
}

export default function ProductDetail({ product, settings }: ProductDetailProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Shipping calculator state
  const [cepInput, setCepInput] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepResult, setCepResult] = useState<{
    city: string;
    uf: string;
    fee: number;
    label: string;
    days: string;
  } | null>(null);

  const handleCalculateShipping = async () => {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      alert('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    setCepLoading(true);
    setCepResult(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        alert('CEP não encontrado. Verifique os dígitos e tente novamente.');
        setCepLoading(false);
        return;
      }

      const uf = data.uf || 'PE';
      const city = data.localidade || '';
      const currentSubtotal = product.price * quantity;
      
      let fee = settings.shippingFee;
      let label = 'Frete Nacional';
      let days = '5 a 10 dias úteis';

      const isFree = settings.shippingFreeThreshold > 0 && currentSubtotal >= settings.shippingFreeThreshold;

      if (isFree) {
        fee = 0;
        label = 'Frete Grátis';
        days = uf.toUpperCase() === (settings.storeState || 'PE').toUpperCase() ? '1 a 3 dias úteis' : '5 a 10 dias úteis';
      } else if (uf.toUpperCase() === (settings.storeState || 'PE').toUpperCase()) {
        fee = settings.shippingFeeLocal !== undefined ? settings.shippingFeeLocal : 10;
        label = 'Frete Local';
        days = '1 a 3 dias úteis';
      } else {
        fee = settings.shippingFeeOthers !== undefined ? settings.shippingFeeOthers : 25;
        label = 'Frete Nacional';
        days = '5 a 10 dias úteis';
      }

      setCepResult({
        city,
        uf,
        fee,
        label,
        days
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao consultar o CEP. Tente novamente mais tarde.');
    } finally {
      setCepLoading(false);
    }
  };

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('pequenos_estilosos_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        setCartCount(parsed.reduce((sum: number, item: any) => sum + item.quantity, 0));
      } catch (e) {
        console.error(e);
      }
    }
    // Set default size
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
  }, [product.sizes]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    setCartCount(newCart.reduce((sum, item) => sum + item.quantity, 0));
    localStorage.setItem('pequenos_estilosos_cart', JSON.stringify(newCart));
  };

  const handleAddToCart = (redirectToCheck = false) => {
    if (!selectedSize) {
      alert('Por favor, selecione um tamanho antes de comprar!');
      return;
    }

    const existingIndex = cart.findIndex(
      item => item.productId === product.id && item.size === selectedSize
    );

    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantity += quantity;
    } else {
      newCart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        size: selectedSize,
        image: product.images[0] || '/images/placeholder.jpg'
      });
    }

    saveCart(newCart);

    if (redirectToCheck) {
      router.push('/checkout');
    } else {
      alert('Produto adicionado ao carrinho com sucesso! Você pode visualizar abrindo o carrinho na página principal ou indo direto para o checkout.');
    }
  };

  const handleCopyLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Build social sharing URLs
  const shareText = `Olha que linda essa roupinha infantil na Pequenos Estilosos! 🧸\n\n*${product.name}*\nPreço: R$ ${product.price.toFixed(2).replace('.', ',')}\n\nVeja mais detalhes aqui: `;
  
  // WhatsApp Share URL
  const whatsappUrl = typeof window !== 'undefined' 
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + window.location.href)}`
    : '#';

  // Instagram doesn't support Web Share API directly, but we can copy link or direct to app
  const instagramDirectUrl = settings.instagramUrl;

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

          <div className="header-actions">
            <Link href="/" className="btn btn-secondary btn-sm" style={{ minHeight: 'unset' }}>
              Voltar à Loja
            </Link>
            
            <Link href="/" className="icon-btn" title="Ir para o carrinho">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      {/* Main product detail section */}
      <main className="container" style={{ flexGrow: 1, padding: '40px 20px' }}>
        <div className="product-detail-layout">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="main-image-wrapper">
              {product.images && product.images[activeImageIndex] && product.images[activeImageIndex] !== '/images/placeholder-vestido.jpg' && product.images[activeImageIndex] !== '/images/placeholder-moletom.jpg' && product.images[activeImageIndex] !== '/images/placeholder-jardineira.jpg' && product.images[activeImageIndex] !== '/images/placeholder-body.jpg' ? (
                <img 
                  src={product.images[activeImageIndex]} 
                  alt={product.name} 
                  className="main-image"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)' }}>
                  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="35" fill="white" stroke="#E5207B" strokeWidth="3"/>
                    <text x="50" y="55" dominantBaseline="middle" textAnchor="middle" fill="#9CA3AF" fontSize="12" fontWeight="600">{product.category}</text>
                  </svg>
                </div>
              )}
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="thumbs-row">
                {product.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`thumb-wrapper ${activeImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={img} alt={`${product.name} foto ${idx + 1}`} className="thumb-img" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="product-info-panel">
            <span className="product-category-tag">{product.category}</span>
            <h1 className="product-detail-title">{product.name}</h1>
            <div className="product-detail-price">R$ {product.price.toFixed(2).replace('.', ',')}</div>
            
            <p className="product-detail-desc">{product.description}</p>

            {/* Size Selector */}
            <div className="detail-sizes-row">
              <h3 className="section-label">Selecione o Tamanho</h3>
              <div className="size-select-list">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    className={`size-btn ${selectedSize === sz ? 'active' : ''}`}
                    onClick={() => setSelectedSize(sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector & Actions */}
            <div className="detail-actions-row">
              <div className="detail-qty">
                <h3 className="section-label">Qtd</h3>
                <div className="qty-controls">
                  <button 
                    type="button" 
                    className="qty-btn"
                    onClick={() => setQuantity(prev => prev > 1 ? prev - 1 : 1)}
                  >
                    -
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button 
                    type="button" 
                    className="qty-btn"
                    onClick={() => setQuantity(prev => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => handleAddToCart(false)} 
                  className="btn btn-secondary btn-block"
                  style={{ height: '48px' }}
                >
                  Adicionar ao Carrinho
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAddToCart(true)} 
                  className="btn btn-primary btn-block"
                  style={{ height: '48px' }}
                >
                  Comprar Agora (PIX/Cartão)
                </button>
              </div>
            </div>

            {/* Calculadora de Frete */}
            <div className="shipping-calc-container">
              <div className="shipping-calc-title">
                🚚 Calcular Frete e Prazos
              </div>
              <div className="shipping-calc-input-row">
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength={9}
                  value={cepInput}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 5) {
                      val = val.substring(0, 5) + '-' + val.substring(5, 8);
                    }
                    setCepInput(val);
                  }}
                  className="shipping-calc-input"
                />
                <button
                  type="button"
                  onClick={handleCalculateShipping}
                  disabled={cepLoading}
                  className="shipping-calc-btn"
                >
                  {cepLoading ? '...' : 'Calcular'}
                </button>
              </div>

              {cepResult && (
                <div className="shipping-calc-result">
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-medium)', fontWeight: '600' }}>
                    Entrega para: {cepResult.city} - {cepResult.uf}
                  </div>
                  <div className="shipping-calc-result-row">
                    <span className="shipping-calc-result-label">{cepResult.label}</span>
                    <span className="shipping-calc-result-val">
                      {cepResult.fee === 0 ? (
                        <span style={{ color: 'var(--success)' }}>Grátis</span>
                      ) : (
                        `R$ ${cepResult.fee.toFixed(2).replace('.', ',')}`
                      )}
                    </span>
                  </div>
                  <div className="shipping-calc-result-row" style={{ fontSize: '11px', color: 'var(--text-medium)', marginTop: '2px' }}>
                    <span>Prazo Estimado</span>
                    <span>{cepResult.days}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Share / Social Box */}
            <div className="detail-share-box">
              <h3 className="section-label" style={{ marginBottom: '14px', fontSize: '13px' }}>
                Compartilhe & Ganhe Estilo
              </h3>
              <div className="share-buttons-row">
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-whatsapp" 
                  style={{ flexGrow: 1, fontSize: '13px', padding: '10px 16px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.023 14.12 1 11.999 1c-5.437 0-9.861 4.372-9.865 9.8-.001 1.766.47 3.49 1.365 5.011L2.474 20.31l4.173-1.156z"/>
                  </svg>
                  Enviar no WhatsApp
                </a>
                
                <button 
                  type="button" 
                  onClick={handleCopyLink} 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1, fontSize: '13px', padding: '10px 16px', background: 'white' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  {copySuccess ? 'Link Copiado!' : 'Copiar Link Instagram'}
                </button>
              </div>
              
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-medium)', textAlign: 'center' }}>
                Copie o link acima para colar diretamente nas suas DMs do Instagram ou nos Stories! 📸
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '30px 0 20px 0' }}>
        <div className="container" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-light)' }}>
          <div>© {new Date().getFullYear()} Pequenos Estilosos - Moda Infantil com Estilo & Conforto</div>
        </div>
      </footer>
    </div>
  );
}
