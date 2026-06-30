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
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-dark)', fontWeight: '700' }}>
                <span>Total do Pedido:</span>
                <span style={{ color: 'var(--primary)' }}>R$ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
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
