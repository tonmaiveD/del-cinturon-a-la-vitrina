/**
 * Criterio de disimilitud orbital D_D (Drummond 1981), en la forma de la Ec. 2 de
 * Peña-Asensio, Socas-Navarro & Seligman (2025), A&A 701, A202.
 * Ángulos de entrada en radianes.
 */
import { punto, type Vec3 } from './vector';

export interface ElementosAngulares {
  q: number;
  e: number;
  i: number;
  nodo: number;
  omega: number;
}

/** Normal al plano orbital. */
const normal = ({ i, nodo }: ElementosAngulares): Vec3 => [
  Math.sin(i) * Math.sin(nodo),
  -Math.sin(i) * Math.cos(nodo),
  Math.cos(i),
];

/** Dirección del perihelio. */
const perihelio = ({ i, nodo, omega }: ElementosAngulares): Vec3 => [
  Math.cos(nodo) * Math.cos(omega) - Math.sin(nodo) * Math.sin(omega) * Math.cos(i),
  Math.sin(nodo) * Math.cos(omega) + Math.cos(nodo) * Math.sin(omega) * Math.cos(i),
  Math.sin(omega) * Math.sin(i),
];

const anguloEntre = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, punto(a, b))));

export function dDrummond(A: ElementosAngulares, B: ElementosAngulares): number {
  const I = anguloEntre(normal(A), normal(B));
  const theta = anguloEntre(perihelio(A), perihelio(B));
  return Math.sqrt(
    ((B.e - A.e) / (B.e + A.e)) ** 2 +
      ((B.q - A.q) / (B.q + A.q)) ** 2 +
      (I / Math.PI) ** 2 +
      ((B.e + A.e) / 2) ** 2 * (theta / Math.PI) ** 2,
  );
}
