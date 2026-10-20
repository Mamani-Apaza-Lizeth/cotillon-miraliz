// Pruebas de componentes de interfaz (renderizado y accesibilidad básica).
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ProductCard } from './catalog/ProductCard';
import { ErrorState, EmptyState } from './ui/Feedback';
import { InputField } from './ui/Field';
import { OrderStatusBadge, OrderTotals } from './orders/OrderBits';
import type { Order, ProductWithRelations } from '../types/db';

const product: ProductWithRelations = {
  id: 'p1', category_id: 'c1', name: 'Globos surtidos', slug: 'globos-surtidos', description: '', product_type: 'reventa',
  sale_unit: 'paquete', units_per_sale: 50, price: 25, allows_custom_design: false, min_order_qty: 1, is_published: true,
  is_featured: true, is_demo: false, created_at: '', updated_at: '', categories: { id: 'c1', name: 'Globos', slug: 'globos' }, product_images: [],
};

describe('ProductCard', () => {
  it('muestra nombre, precio, unidad y disponibilidad', () => {
    render(<MemoryRouter><ProductCard product={product} available={3} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Globos surtidos' })).toBeInTheDocument();
    expect(screen.getByText(/25,00/)).toBeInTheDocument();
    expect(screen.getByText(/paquete \(50 u\.\)/)).toBeInTheDocument();
    expect(screen.getByText('Últimas 3')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/producto/globos-surtidos');
    expect(screen.getByRole('img', { name: /sin fotografía/ })).toBeInTheDocument();
  });
});

describe('Estados de interfaz', () => {
  it('ErrorState ofrece reintentar', async () => {
    const retry = vi.fn();
    render(<ErrorState message="Falló la carga" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló la carga');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('EmptyState muestra título', () => {
    render(<EmptyState title="Sin pedidos" />);
    expect(screen.getByRole('heading', { name: 'Sin pedidos' })).toBeInTheDocument();
  });
  it('InputField asocia etiqueta y error', () => {
    render(<InputField label="Correo" error="Correo inválido" value="" onChange={() => undefined} />);
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Correo inválido');
  });
});

describe('Pedidos', () => {
  const order = {
    id: 'o1', code: 'MZ-001001', status: 'pendiente_pago', fulfillment: 'entrega', subtotal: 100, delivery_fee: 12.5,
    delivery_distance_km: 0.83, total: 112.5, amount_paid: 0, balance: 112.5, required_advance: 56.25,
  } as Order;
  it('OrderTotals distingue total, pagado, saldo y anticipo', () => {
    render(<OrderTotals order={order} />);
    expect(screen.getByText('Saldo pendiente').nextSibling).toHaveTextContent('112,50');
    expect(screen.getByText('Anticipo requerido para confirmar').nextSibling).toHaveTextContent('56,25');
  });
  it('OrderTotals no muestra total durante la cotización', () => {
    render(<OrderTotals order={{ ...order, status: 'cotizacion_pendiente', total: 0 }} />);
    expect(screen.getByText('Por cotizar')).toBeInTheDocument();
    expect(screen.queryByText('Saldo pendiente')).not.toBeInTheDocument();
  });
  it('OrderStatusBadge usa etiquetas en español', () => {
    render(<OrderStatusBadge status="en_produccion" />);
    expect(screen.getByText('En producción')).toBeInTheDocument();
  });
});
