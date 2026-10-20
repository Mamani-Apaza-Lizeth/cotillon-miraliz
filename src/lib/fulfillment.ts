// Valor del selector de entrega/recojo compartido por el checkout y la solicitud de cotización.
import type { FulfillmentType } from '../types/db';

export interface FulfillmentValue {
  fulfillment: FulfillmentType;
  addressText: string;
  reference: string;
  lat: number | null;
  lng: number | null;
}

export const EMPTY_FULFILLMENT: FulfillmentValue = { fulfillment: 'recojo', addressText: '', reference: '', lat: null, lng: null };
