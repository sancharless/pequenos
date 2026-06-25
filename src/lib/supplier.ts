const SUPPLIER_URL = 'https://smmpainel.com/api/v2';
const SUPPLIER_KEY = 'd8bfae98c28440aa77873ef4d109d52a';

export interface SupplierService {
  service: number;
  name: string;
  type: string;
  rate: string; // Rate per 1000
  min: number;
  max: number;
  category: string;
  description?: string;
}

export interface SupplierOrderResponse {
  order?: number;
  error?: string;
}

export interface SupplierStatusResponse {
  status?: string;
  charge?: string;
  start_count?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export const supplierClient = {
  getServices: async (): Promise<SupplierService[]> => {
    try {
      const res = await fetch(SUPPLIER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: SUPPLIER_KEY,
          action: 'services',
        }),
        next: { revalidate: 60 } // Cache for 1 minute
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch services from supplier: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error getting supplier services:', error);
      return [];
    }
  },

  placeOrder: async (serviceId: string, link: string, quantity: number): Promise<SupplierOrderResponse> => {
    try {
      const res = await fetch(SUPPLIER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: SUPPLIER_KEY,
          action: 'add',
          service: serviceId,
          link: link,
          quantity: quantity.toString(),
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to place order with supplier: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error placing supplier order:', error);
      return { error: 'Connection failed with SMM Supplier API.' };
    }
  },

  getOrderStatus: async (orderId: string): Promise<SupplierStatusResponse> => {
    try {
      const res = await fetch(SUPPLIER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: SUPPLIER_KEY,
          action: 'status',
          order: orderId,
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to get order status from supplier: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error getting supplier order status:', error);
      return { error: 'Failed to query order status from SMM Supplier.' };
    }
  },

  getOrderStatuses: async (orderIds: string[]): Promise<Record<string, SupplierStatusResponse>> => {
    try {
      const res = await fetch(SUPPLIER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: SUPPLIER_KEY,
          action: 'status',
          orders: orderIds.join(','),
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to get order statuses from supplier: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error getting supplier order statuses:', error);
      return {};
    }
  },

  refillOrder: async (orderId: string): Promise<{ refill?: string; error?: string }> => {
    try {
      const res = await fetch(SUPPLIER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: SUPPLIER_KEY,
          action: 'refill',
          order: orderId,
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to request refill from supplier: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error requesting supplier refill:', error);
      return { error: 'Connection failed with SMM Supplier API.' };
    }
  }
};
