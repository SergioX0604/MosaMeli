export type Product = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  precio_original?: number | null;
  imagen: string;
  stock: number;
  descripcion?: string | null;
  caracteristicas?: Record<string, string> | string | null;
  imagenes_extra?: string[] | string | null;
  video_url?: string | null;
  marca?: string | null;
  garantia?: string | null;
  rating?: number | null;
  review_count?: number | null;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type OrderStatus =
  | "pedido_recibido"
  | "pago_verificado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

export type Order = {
  id: number;
  usuario_id?: string;
  items: Array<{
    id?: number;
    nombre?: string;
    precio?: number;
    cantidad?: number;
  }>;
  total: number;
  metodo_pago: string;
  estado: OrderStatus | string;
  codigo_seguimiento: string;
  tracking_token?: string;
  cliente_nombre?: string;
  cliente_email?: string;
  costo_delivery?: number;
  costo_real_delivery?: number;
  distancia_delivery?: number;
  direccion_cliente?: string;
  notas_delivery?: string | null;
  tiene_regalo?: boolean;
  pago_declarado?: string | null;
  reserva_expira_en?: string | null;
  stock_liberado_en?: string | null;
  fecha: string;
  fecha_pago_verificado?: string | null;
  fecha_preparacion?: string | null;
  fecha_envio?: string | null;
  fecha_entrega?: string | null;
};

export type Review = {
  id: number;
  producto_id: number;
  usuario_id: string;
  usuario_nombre: string;
  calificacion: number;
  comentario: string | null;
  aprobada: boolean;
  fecha: string;
  productos?: { nombre?: string } | null;
};

export type Profile = {
  id: string;
  email?: string;
  username?: string;
  direccion_principal?: { lat: number; lng: number; texto: string } | null;
  direcciones_guardadas?: Array<{ lat: number; lng: number; texto: string }>;
};

export type TrackingResult = {
  codigo_seguimiento: string;
  cliente_nombre: string;
  total: number;
  metodo_pago: string;
  estado: string;
  fecha: string;
  fecha_pago_verificado: string | null;
  fecha_preparacion: string | null;
  fecha_envio: string | null;
  fecha_entrega: string | null;
};
