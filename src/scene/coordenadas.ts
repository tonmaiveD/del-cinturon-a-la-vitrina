/**
 * Mapeo de los marcos del núcleo (z hacia el polo) a Three.js (y hacia arriba):
 * three = (x, z, −y). Es una rotación propia, así que conserva distancias y orientación.
 * Vista Tierra: marco EQJ geocéntrico, unidades = radio ecuatorial terrestre.
 * Vista sistema solar: marco eclíptico J2000 heliocéntrico, unidades = AU.
 */
import { Vector3 } from 'three';
import type { Vec3 } from '../core/vector';

export const aThree = (v: Vec3, k = 1): Vector3 => new Vector3(v[0] * k, v[2] * k, -v[1] * k);
