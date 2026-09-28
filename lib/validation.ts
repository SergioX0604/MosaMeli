import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(40, "El nombre es demasiado largo"),
  email: z.string().email("Ingresa un correo válido"),
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .max(128, "La contraseña es demasiado larga"),
});

// El RPC crear_pedido lee el array con jsonb_to_recordset(..., cantidad integer),
// por eso la clave debe ser `cantidad` y no `quantity`.
export const orderItemSchema = z.object({
  id: z.number().int().positive(),
  cantidad: z.number().int().positive().max(99),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "El carrito está vacío").max(50),
  metodo_pago: z.enum(["plin", "yape", "transferencia"]),
  direccion: z.string().trim().min(5).max(300),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  notas: z.string().trim().max(500).optional().default(""),
  idempotencyKey: z.string().uuid(),
});

export const productSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  categoria: z.string().trim().min(1).max(60),
  precio: z.number().positive(),
  precioOriginal: z.number().nonnegative().nullable(),
  imagen: z.string().url().max(2000),
  stock: z.number().int().nonnegative(),
});

export const orderStatusSchema = z.enum([
  "pedido_recibido",
  "pago_verificado",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
]);
