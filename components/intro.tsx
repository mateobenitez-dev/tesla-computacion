"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LOGO_ALTO,
  LOGO_ANCHO,
  LOGO_CIRCUITO,
  LOGO_LETRAS,
  LOGO_TEXTO,
} from "@/lib/logo-tesla-svg";

/**
 * Intro de la home ("Corriente"): la corriente entra por el circuito del logo y va
 * prendiendo las letras de la A a la T. Después la pantalla sube como una persiana
 * y el logo vuela a la barra. Desde la 2ª visita (localStorage) va más rápido.
 * Un click o toque la saltea.
 */

const CLAVE = "tesla-intro-visto";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DIBUJO = "cubic-bezier(0.45, 0, 0.2, 1)";
const AZUL = "#1c62ff";
const AZUL_CLARO = "#4d8bff";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Intro() {
  const pathname = usePathname();
  // Solo cuando se entra a la web por la home (el layout persiste en navegaciones internas).
  const [activa, setActiva] = useState(pathname === "/");

  const raiz = useRef<HTMLDivElement>(null);
  const persiana = useRef<HTMLDivElement>(null);
  const logoVuelo = useRef<HTMLDivElement>(null);
  const logoSvg = useRef<SVGSVGElement>(null);
  const brillo = useRef<HTMLDivElement>(null);
  const saltar = useRef<() => void>(() => {});

  useIsoLayoutEffect(() => {
    if (!activa) return;
    const html = document.documentElement;
    html.classList.add("intro-activa");
    window.scrollTo(0, 0);

    let cancelada = false;
    let terminada = false;
    const animaciones: Animation[] = [];
    const anim = (el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (!el) return Promise.resolve();
      const a = el.animate(frames, { fill: "forwards", easing: EASE, ...opts });
      animaciones.push(a);
      return a.finished.then(
        () => undefined,
        () => undefined
      );
    };

    let visto = false;
    try {
      visto = localStorage.getItem(CLAVE) === "1";
    } catch {}

    const cerrar = () => {
      if (terminada) return;
      terminada = true;
      try {
        localStorage.setItem(CLAVE, "1");
      } catch {}
      html.classList.remove("intro-activa");
      setActiva(false);
    };

    // Salteo: se desvanece todo y listo.
    saltar.current = () => {
      if (terminada || cancelada) return;
      cancelada = true;
      animaciones.forEach((a) => a.pause());
      html.classList.remove("intro-activa");
      anim(raiz.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 450 }).then(cerrar);
    };

    const correr = async () => {
      // En la 2ª visita todo dura menos.
      const t = (ms: number) => Math.round(ms * (visto ? 0.65 : 1));
      const svg = logoSvg.current;
      if (!svg) return;
      svg.style.opacity = "1";

      // ---------- 1. La corriente entra por el circuito y prende las letras ----------
      const letras = Array.from(svg.querySelectorAll<SVGGElement>("[data-letra]"));
      // Contorno tenue de las letras, todavía apagadas.
      letras.forEach((g) =>
        g.querySelectorAll("[data-trazo]").forEach((trazo) =>
          anim(trazo, [{ strokeOpacity: 0 }, { strokeOpacity: 0.22 }], { duration: t(500) })
        )
      );
      // El circuito se dibuja en azul, desde los puntos hacia las letras.
      const circ = svg.querySelector("[data-circuito]");
      circ?.querySelectorAll("[data-trazo]").forEach((trazo) => {
        anim(trazo, [{ strokeDashoffset: -1 }, { strokeDashoffset: 0 }], {
          duration: t(900),
          delay: t(250),
          easing: DIBUJO,
        });
        anim(trazo, [{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: t(500), delay: t(1150) });
      });
      anim(circ?.querySelector("[data-relleno]"), [
        { fillOpacity: 0, fill: AZUL_CLARO },
        { fillOpacity: 1, fill: "#fff" },
      ], { duration: t(700), delay: t(950) });
      // Las letras se prenden de la A a la T con un destello azul.
      [...letras].reverse().forEach((g, i) => {
        const d = t(1150 + i * 120);
        anim(g.querySelector("[data-relleno]"), [
          { fillOpacity: 0, fill: AZUL },
          { fillOpacity: 1, fill: "#8fbaff", offset: 0.35 },
          { fillOpacity: 1, fill: "#fff" },
        ], { duration: t(750), delay: d });
        g.querySelectorAll("[data-trazo]").forEach((trazo) =>
          anim(trazo, [{ strokeOpacity: 0.22 }, { strokeOpacity: 0 }], { duration: t(400), delay: d + t(200) })
        );
      });
      // "computación" y el brillo de fondo.
      svg.querySelectorAll("[data-glifo]").forEach((g, i) =>
        anim(g, [{ opacity: 0 }, { opacity: 1 }], { duration: t(500), delay: t(1500 + i * 40) })
      );
      anim(brillo.current, [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.75 }], {
        duration: t(1200),
        delay: t(1500),
      });

      await esperar(t(2600));
      if (cancelada) return;
      try {
        localStorage.setItem(CLAVE, "1");
      } catch {}

      // ---------- 2. La pantalla sube y el logo vuela a la barra ----------
      const destino = document.querySelector("[data-intro-target]")?.getBoundingClientRect();
      const origen = logoVuelo.current?.getBoundingClientRect();
      const vuelo =
        destino && origen && destino.width > 0
          ? [
              { transform: "none" },
              {
                transform: `translate(${destino.left + destino.width / 2 - (origen.left + origen.width / 2)}px, ${
                  destino.top + destino.height / 2 - (origen.top + origen.height / 2)
                }px) scale(${destino.width / origen.width})`,
              },
            ]
          : [{ opacity: 1 }, { opacity: 0 }];

      const DUR = 1050;
      anim(brillo.current, [{ opacity: 0.75 }, { opacity: 0 }], { duration: 500 });
      anim(persiana.current, [{ transform: "none" }, { transform: "translateY(-100%)" }], {
        duration: DUR,
        easing: "cubic-bezier(0.76, 0, 0.24, 1)",
      });
      await anim(logoVuelo.current, vuelo, { duration: DUR, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
      if (cancelada) return;
      html.classList.remove("intro-activa");
      await anim(logoVuelo.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
      cerrar();
    };

    correr();

    return () => {
      cancelada = true;
      animaciones.forEach((a) => a.cancel());
      html.classList.remove("intro-activa");
    };
  }, [activa]);

  if (!activa) return null;

  return (
    <div
      ref={raiz}
      className="tesla-intro fixed inset-0 z-[100] cursor-pointer select-none"
      onClick={() => saltar.current()}
      role="presentation"
      aria-hidden
    >
      <noscript>
        <style>{`.tesla-intro{display:none}`}</style>
      </noscript>

      {/* La persiana que sube */}
      <div ref={persiana} className="absolute inset-0 bg-[#020612]" />

      {/* Logo que se prende y vuela a la barra */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        <div className="relative">
          <div
            ref={brillo}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[180%] w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-0"
            style={{
              background: `radial-gradient(closest-side, ${AZUL}4d, ${AZUL}1f 45%, ${AZUL}0a 72%, transparent)`,
            }}
          />
          <div ref={logoVuelo} className="relative w-[min(72vw,440px)] origin-center">
            <LogoSvg ref={logoSvg} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cada subtrazado por separado, para que el contorno se dibuje parejo en todas las piezas. */
const subtrazos = (d: string) => d.split(/(?=M)/).filter(Boolean);

type PiezaProps = {
  d: string;
  color?: string;
  /** Estado inicial del contorno antes de animarlo. */
  trazo: { strokeDashoffset: number; strokeOpacity: number };
} & React.SVGProps<SVGGElement>;

function Pieza({ d, color = "#fff", trazo, ...rest }: PiezaProps) {
  return (
    <g {...rest}>
      <path data-relleno d={d} fill="#fff" fillRule="evenodd" style={{ fillOpacity: 0 }} />
      {subtrazos(d).map((s, i) => (
        <path
          key={i}
          data-trazo
          d={s}
          pathLength={1}
          fill="none"
          stroke={color}
          strokeWidth={1.3}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1, ...trazo }}
        />
      ))}
    </g>
  );
}

function LogoSvg({ ref }: { ref: React.Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${LOGO_ANCHO} ${LOGO_ALTO}`}
      className="block h-auto w-full overflow-visible opacity-0"
      aria-hidden
    >
      {LOGO_LETRAS.map((d, i) => (
        <Pieza key={i} d={d} trazo={{ strokeDashoffset: 0, strokeOpacity: 0 }} data-letra="" />
      ))}
      <Pieza
        d={LOGO_CIRCUITO[0]}
        color={AZUL_CLARO}
        trazo={{ strokeDashoffset: -1, strokeOpacity: 1 }}
        data-circuito=""
      />
      {LOGO_TEXTO.map((d, i) => (
        <path key={i} data-glifo d={d} fill="#fff" fillRule="evenodd" style={{ opacity: 0 }} />
      ))}
    </svg>
  );
}
