'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EcommerceOrder, EcommerceSettings } from '@/lib/db';

interface OrderConfirmationProps {
  initialOrder: EcommerceOrder;
  settings: EcommerceSettings;
}

export default function OrderConfirmation({ initialOrder, settings }: OrderConfirmationProps) {
  const [order, setOrder] = useState<EcommerceOrder>(initialOrder);
  const [copied, setCopied] = useState(false);

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderShippingFee = Math.max(0, order.totalAmount - subtotal);

  // Poll for order payment status updates
  useEffect(() => {
    if (order.paymentStatus === 'approved' || order.paymentStatus === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        if (res.ok) {
          const updatedOrder = await res.json();
          if (updatedOrder.paymentStatus !== order.paymentStatus) {
            setOrder(updatedOrder);
            if (updatedOrder.paymentStatus === 'approved') {
              clearInterval(interval);
            }
          }
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [order.id, order.paymentStatus]);

  const handleCopyPix = () => {
    if (order.qrCode) {
      navigator.clipboard.writeText(order.qrCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const whatsappMessage = `Olá! Fiz o pagamento do meu pedido #${order.id} na Pequenos Estilosos no valor de R$ ${order.totalAmount.toFixed(2).replace('.', ',')}. Segue o comprovante de pagamento.`;
  const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex-col min-h-screen bg-light">
      {/* Header */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo-link">
            <img src="/logo.png" alt="Pequenos Estilosos Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            <span className="logo-text">Pequenos Estilosos</span>
          </Link>
          <span style={{ fontSize: '14px', color: 'var(--text-medium)', fontWeight: '600' }}>Pedido Recebido</span>
        </div>
      </header>

      {/* Content */}
      <main className="container" style={{ flexGrow: 1, padding: '30px 20px' }}>
        <div className="order-status-card">
          
          {order.paymentStatus === 'approved' ? (
            <>
              <div className="order-success-icon">✓</div>
              <h1 className="order-status-title">Pagamento Confirmado!</h1>
              <p className="order-status-subtitle">
                Obrigado! Seu pagamento do pedido <strong>#{order.id}</strong> foi aprovado. 
                Estamos preparando suas peças infantis com todo carinho para envio!
              </p>
            </>
          ) : order.paymentStatus === 'cancelled' || order.paymentStatus === 'rejected' ? (
            <>
              <div className="order-pending-icon" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>✕</div>
              <h1 className="order-status-title">Pedido Cancelado</h1>
              <p className="order-status-subtitle">
                O pagamento do pedido <strong>#{order.id}</strong> foi recusado ou expirou.
              </p>
            </>
          ) : (
            <>
              <div className="order-pending-icon">⏳</div>
              <h1 className="order-status-title">Pedido Recebido!</h1>
              <p className="order-status-subtitle">
                Seu pedido <strong>#{order.id}</strong> foi registrado com sucesso. 
                Aguardando a confirmação do pagamento via PIX.
              </p>

              {/* PIX Payment box */}
              <div className="pix-box">
                <h3 style={{ fontSize: '16px', color: 'var(--text-dark)', fontWeight: '700' }}>
                  Pague com PIX para confirmar
                </h3>
                
                {order.qrCodeBase64 ? (
                  <img 
                    src={order.qrCodeBase64} 
                    alt="QR Code PIX Mercado Pago" 
                    className="pix-qr-img" 
                  />
                ) : (
                  <div className="pix-qr-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', border: '1px solid #ccc' }}>
                    Erro ao carregar QR Code
                  </div>
                )}

                <div className="pix-code-container">
                  <span className="form-label" style={{ marginBottom: '6px', display: 'block', textAlign: 'left' }}>
                    PIX Copia e Cola:
                  </span>
                  <div className="pix-code-input-wrapper">
                    <div className="pix-code-input">{order.qrCode}</div>
                    <button 
                      type="button" 
                      onClick={handleCopyPix}
                      className="btn btn-primary" 
                      style={{ borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: '13px' }}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-medium)', fontStyle: 'italic' }}>
                  Dica: Abra o app do seu banco, escolha "Pagar via PIX" e selecione "Copia e Cola" ou aponte a câmera para o QR Code acima.
                </div>
              </div>
            </>
          )}

          {/* Customer info detail */}
          <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px', marginBottom: '16px' }}>
              Detalhes da Entrega
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-medium)' }}>
              <div><strong>Destinatário:</strong> {order.customerName}</div>
              <div><strong>WhatsApp:</strong> {order.customerPhone}</div>
              <div><strong>E-mail:</strong> {order.customerEmail}</div>
              <div>
                <strong>Endereço:</strong> {order.customerAddress.street}, {order.customerAddress.number} 
                {order.customerAddress.complement && ` - ${order.customerAddress.complement}`}
              </div>
              <div>
                <strong>Bairro:</strong> {order.customerAddress.neighborhood} | 
                <strong> CEP:</strong> {order.customerAddress.zipCode}
              </div>
              <div><strong>Cidade/UF:</strong> {order.customerAddress.city} - {order.customerAddress.state}</div>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-medium)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Frete:</span>
                  <span>
                    {orderShippingFee === 0 ? (
                      <span style={{ color: 'var(--success)', fontWeight: '600' }}>Grátis</span>
                    ) : (
                      `R$ ${orderShippingFee.toFixed(2).replace('.', ',')}`
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dark)', fontWeight: '700', fontSize: '15px', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed var(--border-dark)' }}>
                  <span>Total do Pedido:</span>
                  <span style={{ color: 'var(--primary)' }}>R$ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.paymentStatus !== 'approved' && (
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-whatsapp"
                style={{ height: '48px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.023 14.12 1 11.999 1c-5.437 0-9.861 4.372-9.865 9.8-.001 1.766.47 3.49 1.365 5.011L2.474 20.31l4.173-1.156z"/>
                </svg>
                Enviar Comprovante pelo WhatsApp
              </a>
            )}
            
            <Link href="/" className="btn btn-secondary" style={{ height: '48px' }}>
              Voltar para a Vitrine
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
