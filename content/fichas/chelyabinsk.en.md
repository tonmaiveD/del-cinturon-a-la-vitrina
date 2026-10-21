---
pieza: chelyabinsk
estado: aprobada
redaccion: Claude (English translation of the approved Spanish fact sheet of 2026-10-12, M38), not generated automatically
revisado_por: Pablo Hoffenberg
fecha_revision: 2026-10-21
---

## What happened

On {{fecha}}, at about {{hora}} UTC, a small asteroid entered the atmosphere over the Urals. It was about {{diametro}} m across and entered the atmosphere at {{v_entrada}} km/s, according to the reconstruction by Popova et al. Before Earth's gravity accelerated it, its speed relative to Earth was {{vg}} km/s.

According to the U.S. Government sensors whose data CNEOS publishes, peak brightness occurred at an altitude of {{alt_pico_cneos}} km, over {{lat}} and {{lon}}, when the asteroid was traveling at {{v_pico_cneos}} km/s. Popova et al., who reconstructed the trajectory from videos, place maximum brightness higher, at {{alt_pico_popova}} km, where the asteroid broke apart. According to the same work, its two main fragments flared again at around {{alt_destello}} km. It has not been established whether that is the flare CNEOS recorded.

The asteroid did not reach the ground in one piece. It fragmented in the air in several stages. CNEOS estimates the total impact energy of the event at {{energia_kt}} kilotons of TNT. That figure comes from an empirical formula ({{ref_energia}}) applied to the energy the fireball emitted as light according to the sensors (the radiated optical energy), about {{energia_radiada_kt}} kilotons, rather than from a direct measurement.

The fragments that reached the ground are meteorites of type **{{clase}}**. The letters indicate an ordinary chondrite low in iron and metal. The {{tipo_petrologico}} is the petrologic type, which indicates the degree of thermal metamorphism the rock underwent inside its parent body, the larger asteroid it broke off from.

## Where it came from

Before the impact, the asteroid orbited the Sun on an orbit with a semi-major axis of {{a}} au, an eccentricity of {{e}} and an inclination of {{i}}° to the ecliptic, the plane of Earth's orbit. These are the values published by Popova et al. At its closest point to the Sun (perihelion) it passed at {{q}} au, near the orbit of Venus, and at its farthest (aphelion) it reached {{Q}} au, within the main asteroid belt.

Popova et al. applied a statistical source-region model to that orbit ({{modelo_procedencia}}). According to that model, there are three main routes by which it could have arrived from the belt, namely the {{n_nu6}} ({{p_nu6}}%), the {{n_imc}} ({{p_imc}}%) and the {{n_31}} ({{p_31}}%). The remaining {{p_ob}}% corresponds to the {{n_ob}}, and the model assigns {{p_jfc}}% to the {{n_jfc}}. These are probabilities from a model, not a trajectory reconstructed backward.

## How to read the visualization

The orbit is drawn as a cloud instead of a single line. The brightest line is the orbit published by Popova et al., with all the digits they give in their supplementary material. The path over the year before impact (the trail) is computed with the project's integration model from the entry measurements published by Popova et al., that is, the direction and speed with which the asteroid entered the atmosphere and the place and time of that entry.

Each line in the cloud is a possible orbit. The elements of the published orbit are sampled, each from a normal distribution centered on its value and with a standard deviation equal to its uncertainty at {{nivel_nube}}, for example ±{{q_sigma1}} au in perihelion distance, ±{{e_sigma1}} in eccentricity and ±{{i_sigma1}}° in inclination. In the paper those margins appear doubled, ±{{q_sigma}} au, ±{{e_sigma}} and ±{{i_sigma}}°, because they are given there at {{nivel_orbita}}. In that initial sampling, about a third of the values of each element fall outside its margin. Only the orbits that, without Earth's attraction, would pass within about {{radio_captura}} km of Earth's center are kept, because that is the largest distance at which its gravity would still make them collide. Each one is drawn at its closest point to Earth at the moment of impact. This geometric conditioning does not reconstruct the full distribution of the original observational errors.

Popova et al. obtained those margins with a Monte Carlo method, from their measurement of the radiant and the speed. The cloud reproduces their margins in eccentricity and inclination, while in the distance and orientation of the perihelion it comes out narrower, because the encounter with Earth constrains them. The semi-major axis is derived from the perihelion distance and the eccentricity. The margin the paper gives for it, ±{{a_sigma}} au at {{nivel_orbita}}, is larger than those two margins allow under linear propagation, even with perfect correlation, so the cloud does not reproduce it. The available documentation does not explain the difference. The [cloud report](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/nubes.md) compares this method with other possible ones. Where the cloud looks denser there are more sampled orbits, but that density is not a calibrated probability of where the asteroid passed.

An independent calculation, made here from the position and velocity published by CNEOS, gives an orbit consistent with this one if the typical errors that {{ref_errores_cneos}} estimate for the most energetic or recent CNEOS fireballs are applied. CNEOS does not publish an uncertainty for each fireball, so this is not one measured for Chelyabinsk. The details are in the [validation report](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/chelyabinsk.md). The CNEOS data were retrieved on {{cneos_consultado}}.
