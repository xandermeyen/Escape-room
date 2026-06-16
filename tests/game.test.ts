import { describe, it, expect, beforeEach } from 'vitest';
import { updateVoortgang, markeerVoltooid } from '../shared/js/game.ts';

const STAPPEN = ['vp1', 'vp2', 'vp3', 'vp4', 'vp5'];
const heeft = (id: string, klasse: string) =>
  document.getElementById(id)!.classList.contains(klasse);

describe('updateVoortgang', () => {
  beforeEach(() => {
    document.body.innerHTML = STAPPEN.map(id => `<div id="${id}"></div>`).join('');
  });

  it('markeert opgeloste puzzels als klaar en de eerstvolgende als bezig', () => {
    updateVoortgang({ p1: true, p2: true });
    expect(heeft('vp1', 'vp-klaar')).toBe(true);
    expect(heeft('vp2', 'vp-klaar')).toBe(true);
    expect(heeft('vp3', 'vp-bezig')).toBe(true);
    expect(heeft('vp4', 'vp-open')).toBe(true);
    expect(heeft('vp5', 'vp-open')).toBe(true);
  });

  it('zonder voortgang is alleen de eerste stap bezig', () => {
    updateVoortgang({});
    expect(heeft('vp1', 'vp-bezig')).toBe(true);
    expect(heeft('vp2', 'vp-open')).toBe(true);
  });

  it('alles klaar: geen enkele stap meer bezig', () => {
    updateVoortgang({ p1: true, p2: true, p3: true, p4: true, p5: true });
    expect(STAPPEN.filter(id => heeft(id, 'vp-bezig'))).toHaveLength(0);
    expect(heeft('vp5', 'vp-klaar')).toBe(true);
  });

  it('reset eerdere klassen bij herberekening', () => {
    updateVoortgang({ p1: true });
    expect(heeft('vp1', 'vp-klaar')).toBe(true);
    updateVoortgang({});
    expect(heeft('vp1', 'vp-klaar')).toBe(false);
    expect(heeft('vp1', 'vp-bezig')).toBe(true);
  });

  it('negeert ontbrekende DOM-elementen zonder te crashen', () => {
    document.body.innerHTML = '<div id="vp1"></div>';
    expect(() => updateVoortgang({ p1: true })).not.toThrow();
    expect(heeft('vp1', 'vp-klaar')).toBe(true);
  });
});

describe('markeerVoltooid', () => {
  it('verbergt het blok', () => {
    document.body.innerHTML = '<div id="puzzel1"></div>';
    markeerVoltooid('puzzel1');
    expect(heeft('puzzel1', 'verborgen')).toBe(true);
  });

  it('crasht niet bij een onbekend id', () => {
    document.body.innerHTML = '';
    expect(() => markeerVoltooid('bestaat-niet')).not.toThrow();
  });
});
