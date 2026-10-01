import { describe, expect, it, vi } from 'vitest';
import { crearSecuencia, suavizar } from '../../src/camera/coreografia';
import { interpolar, type Muestra } from '../../src/timeline/interpolacion';
import { crearReloj } from '../../src/timeline/reloj';
import { escribirEstadoUrl, leerEstadoUrl, type EstadoUrl } from '../../src/ui/estado-url';

describe('reloj de simulación', () => {
  it('avanza a la velocidad fijada, se detiene al final y no sale del rango', () => {
    const r = crearReloj(0, 10_000, 0);
    r.fijarVelocidad(1000);
    r.reproducir(true);
    r.avanzar(0.004); // 4 ms reales × 1000 = 4 s simulados
    expect(r.estado().t).toBe(4000);
    r.avanzar(1);
    expect(r.estado().t).toBe(10_000);
    expect(r.estado().reproduciendo).toBe(false);
    r.irA(-5);
    expect(r.estado().t).toBe(0);
  });
  it('reproducir desde el final reinicia al principio', () => {
    const r = crearReloj(0, 10, 10);
    r.reproducir(true);
    expect(r.estado().t).toBe(0);
  });
  it('notifica cambios', () => {
    const r = crearReloj(0, 10, 0);
    const f = vi.fn();
    r.alCambiar(f);
    r.irA(5);
    expect(f).toHaveBeenCalledOnce();
  });
});

describe('interpolación', () => {
  const serie: Muestra[] = [
    [0, 0, 0, 0],
    [1, 10, 0, 0],
    [3, 10, 20, 0],
  ];
  it('interpola linealmente y satura en los extremos', () => {
    expect(interpolar(serie, 0.5)).toEqual([5, 0, 0]);
    expect(interpolar(serie, 2)).toEqual([10, 10, 0]);
    expect(interpolar(serie, -1)).toEqual([0, 0, 0]);
    expect(interpolar(serie, 9)).toEqual([10, 20, 0]);
  });
});

describe('estado en la URL', () => {
  const base: EstadoUrl = {
    pieza: 'chelyabinsk',
    t: undefined,
    vista: 'tierra',
    escalaVisual: true,
  };
  it('ida y vuelta', () => {
    const e: EstadoUrl = {
      pieza: 'chelyabinsk',
      t: Date.parse('2013-02-15T03:20:26Z'),
      vista: 'sistema-solar',
      escalaVisual: false,
    };
    expect(leerEstadoUrl(escribirEstadoUrl(e), base)).toEqual(e);
    expect(escribirEstadoUrl(e)).toBe(
      '?pieza=chelyabinsk&t=2013-02-15T03%3A20%3A26Z&vista=sistema-solar&escala=real',
    );
  });
  it('ignora valores inválidos', () => {
    expect(leerEstadoUrl('?vista=marte&t=ayer', base)).toEqual(base);
  });
});

describe('secuencias de cámara', () => {
  it('suavizado acotado y simétrico', () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(1)).toBe(1);
    expect(suavizar(0.5)).toBeCloseTo(0.5, 12);
  });
  it('recorre los pasos en orden y termina', () => {
    const orden: string[] = [];
    const fin = vi.fn();
    const s = crearSecuencia(
      [
        { duracion: 1, alEmpezar: () => orden.push('a') },
        { duracion: 2, alEmpezar: () => orden.push('b') },
      ],
      fin,
    );
    s.iniciar();
    s.avanzar(0.5);
    expect(s.pasoActual()).toBe(0);
    s.avanzar(1);
    expect(s.pasoActual()).toBe(1);
    expect(s.avanzar(5)).toBe(false);
    expect(orden).toEqual(['a', 'b']);
    expect(fin).toHaveBeenCalledOnce();
  });
});
