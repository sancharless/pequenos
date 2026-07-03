'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, EcommerceSettings } from '@/lib/db';

interface StoreFrontProps {
  products: Product[];
  settings: EcommerceSettings;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

export default function StoreFront({ products, settings }: StoreFrontProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pequenos_estilosos_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart data', e);
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('pequenos_estilosos_cart', JSON.stringify(newCart));
  };

  const addToCart = (product: Product, size: string) => {
    const existingIndex = cart.findIndex(
      item => item.productId === product.id && item.size === size
    );

    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantity += 1;
    } else {
      newCart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: size,
        image: product.images[0] || '/images/placeholder.jpg'
      });
    }
    saveCart(newCart);
    setIsCartOpen(true); // Open cart automatically when adding item
  };

  const removeFromCart = (productId: string, size: string) => {
    const newCart = cart.filter(item => !(item.productId === productId && item.size === size));
    saveCart(newCart);
  };

  const updateQuantity = (productId: string, size: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.productId === productId && item.size === size) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty < 1 ? 1 : newQty };
      }
      return item;
    });
    saveCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Filter products by category and search
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-col min-h-screen bg-light">
      {/* Header */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo-link">
            <img src="/logo.png" alt="Pequenos Estilosos Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            <span className="logo-text">Pequenos Estilosos</span>
          </Link>

          <nav className="nav-links">
            <button 
              onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); }}
              className={`nav-link ${selectedCategory === 'Todos' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Catálogo
            </button>
            <button 
              onClick={() => setSelectedCategory('Menina')}
              className={`nav-link ${selectedCategory === 'Menina' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Meninas
            </button>
            <button 
              onClick={() => setSelectedCategory('Menino')}
              className={`nav-link ${selectedCategory === 'Menino' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Meninos
            </button>
            <button 
              onClick={() => setSelectedCategory('Bebê')}
              className={`nav-link ${selectedCategory === 'Bebê' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Bebês
            </button>
          </nav>

          <div className="header-actions">
            <Link href="/admin" className="icon-btn" title="Painel Admin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Link>
            
            <button className="icon-btn" onClick={() => setIsCartOpen(true)} title="Carrinho">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-content">
            <h1>Roupas infantis cheias de <span>estilo</span> & <span>conforto</span>!</h1>
            <p>Deixe seus pequenos ainda mais charmosos com nossa coleção exclusiva. Peças macias, antialérgicas e com o caimento perfeito para a diversão de todo dia.</p>
            <div className="flex gap-2">
              <button onClick={() => {
                document.getElementById('vitrine')?.scrollIntoView({ behavior: 'smooth' });
              }} className="btn btn-primary">
                Ver Coleção
              </button>
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.023 14.12 1 11.999 1c-5.437 0-9.861 4.372-9.865 9.8-.001 1.766.47 3.49 1.365 5.011L2.474 20.31l4.173-1.156z"/>
                </svg>
                Fale Conosco
              </a>
            </div>
          </div>
          
          <div className="hero-image-container">
            <div className="hero-circle-bg">
              <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                {/* SVG Character representation from Logo */}
                <img src="/logo.png" alt="Pequenos Estilosos Principal" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main id="vitrine" className="container" style={{ flexGrow: 1, paddingBottom: '60px' }}>
        {/* Search & Category Filter Section */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
              <input 
                type="text" 
                placeholder="Buscar roupas infantis..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '100%', borderRadius: 'var(--radius-full)', paddingLeft: '48px', paddingRight: '20px', height: '48px', borderWidth: '1.5px' }}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '18px', top: '14px', color: 'var(--text-light)' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div className="categories-container">
            {['Todos', 'Bebê', 'Menina', 'Menino', 'Acessórios'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                {product.featured && <span className="product-card-badge">Novidade</span>}
                <Link href={`/product/${product.id}`} className="product-card-img-wrapper">
                  {/* Fallback to placeholder character svg if image fails or is empty */}
                  {product.images && product.images[0] && product.images[0] !== '/images/placeholder-vestido.jpg' && product.images[0] !== '/images/placeholder-moletom.jpg' && product.images[0] !== '/images/placeholder-jardineira.jpg' && product.images[0] !== '/images/placeholder-body.jpg' ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="product-card-img"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)' }}>
                      <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="35" fill="white" stroke={product.category === 'Menina' ? '#E5207B' : '#0CA5C4'} strokeWidth="3"/>
                        <text x="50" y="55" dominantBaseline="middle" textAnchor="middle" fill="#9CA3AF" fontSize="12" fontWeight="600">{product.category}</text>
                      </svg>
                    </div>
                  )}
                </Link>
                
                <div className="product-card-body">
                  <span className="product-card-category">{product.category}</span>
                  <Link href={`/product/${product.id}`}>
                    <h3 className="product-card-title">{product.name}</h3>
                  </Link>
                  
                  <div className="product-card-sizes">
                    {product.sizes.map((sz) => (
                      <span key={sz} className="size-tag">{sz}</span>
                    ))}
                  </div>

                  <div className="product-card-price-row">
                    <span className="product-card-price">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    
                    <Link href={`/product/${product.id}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', minHeight: 'unset' }}>
                      Detalhes
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-medium)' }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px auto', display: 'block', color: 'var(--text-light)' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <h3>Nenhum produto encontrado</h3>
            <p style={{ marginTop: '8px' }}>Tente mudar os filtros ou refinar a busca.</p>
          </div>
        )}
      </main>

      {/* Cart Overlay & Drawer */}
      <div 
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={() => setIsCartOpen(false)}
      />
      
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 className="cart-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Meu Carrinho
          </h2>
          <button className="cart-close-btn" onClick={() => setIsCartOpen(false)}>×</button>
        </div>

        <div className="cart-items-list">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <div key={`${item.productId}-${item.size}-${index}`} className="cart-item">
                {item.image && item.image !== '/images/placeholder-vestido.jpg' && item.image !== '/images/placeholder-moletom.jpg' && item.image !== '/images/placeholder-jardineira.jpg' && item.image !== '/images/placeholder-body.jpg' ? (
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                ) : (
                  <div className="cart-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                )}
                <div className="cart-item-info">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <div className="cart-item-meta">Tamanho: {item.size}</div>
                  <div className="cart-item-price">R$ {item.price.toFixed(2).replace('.', ',')}</div>
                  
                  <div className="cart-item-actions">
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.size, -1)}>-</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.size, 1)}>+</button>
                    </div>
                    
                    <button className="remove-item-btn" onClick={() => removeFromCart(item.productId, item.size)}>
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <span className="cart-empty-icon">🛒</span>
              <h3>Seu carrinho está vazio!</h3>
              <p>Que tal dar uma olhada em nossas roupinhas estilosas e escolher sua favorita?</p>
              <button onClick={() => setIsCartOpen(false)} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
                Continuar Navegando
              </button>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Subtotal</span>
              <span className="cart-total-val">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            
            <Link href="/checkout" className="btn btn-primary btn-block">
              Finalizar Compra
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '40px 0 20px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '40px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '16px', color: 'var(--primary)' }}>
                Pequenos Estilosos
              </h3>
              <p style={{ color: 'var(--text-medium)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                Moda infantil com amor, conforto e estilo para todos os momentos. Do bebê ao infanto-juvenil.
              </p>
            </div>
            
            <div>
              <h4 style={{ fontSize: '15px', textTransform: 'uppercase', color: 'var(--text-dark)', marginBottom: '16px' }}>
                Categorias
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-medium)' }}>
                <li><button onClick={() => setSelectedCategory('Menina')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Meninas</button></li>
                <li><button onClick={() => setSelectedCategory('Menino')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Meninos</button></li>
                <li><button onClick={() => setSelectedCategory('Bebê')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Bebês</button></li>
                <li><button onClick={() => setSelectedCategory('Acessórios')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Acessórios</button></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '15px', textTransform: 'uppercase', color: 'var(--text-dark)', marginBottom: '16px' }}>
                Redes Sociais & Contato
              </h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="icon-btn" title="WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.023 14.12 1 11.999 1c-5.437 0-9.861 4.372-9.865 9.8-.001 1.766.47 3.49 1.365 5.011L2.474 20.31l4.173-1.156z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-light)', flexWrap: 'wrap', gap: '12px' }}>
            <span>© {new Date().getFullYear()} Pequenos Estilosos - Todos os direitos reservados.</span>
            <span>Feito com amor ❤️</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
