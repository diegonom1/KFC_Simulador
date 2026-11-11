# Simulador de migración SD-WAN (sucursal)

Sitio web para **practicar el trabajo de campo** de una migración de red a SD-WAN en una sucursal de restaurante antes de hacerlo en la vida real. Todo corre en el navegador (sin backend) y el avance se guarda en `localStorage`.

- **Modo guiado**: un panel de misión dice qué sigue, por qué y qué buscar; el elemento que hay que tocar se ilumina con un anillo y una pista. Si te equivocas, te explica qué pasaría en la vida real y cómo corregirlo.
- **Modo examen**: genera una sucursal aleatoria (CECO, segmentos viejo y nuevo, HME 50 o 60, PC con o sin ranura PCI, uno o dos carriers, módems de más, puerto dañado, marca de impresora). Sin pistas, con cronómetro, preguntas teóricas intercaladas y calificación con desglose (bien, faltó, fuera de orden, errores).
- **Hoja de evidencias imprimible** al terminar cualquiera de los dos modos.
- **Referencia rápida**: orden de pasos, credenciales de ejemplo, comandos, antes/después de `/etc/network/interfaces`, calculadora de contraseña por CECO y calculadora de network/broadcast.

> ⚠️ Todas las IPs, contraseñas y equipos son **valores de ejemplo**. Se cambian en un solo archivo: `src/data/sucursal.ts`.

## Qué se puede practicar

| Área | Qué simula |
| --- | --- |
| Escena | Plano isométrico de la sucursal con todos los equipos clicables, arcos de red animados y estado por color (listo, en progreso, pendiente, con error). |
| Laptop | Ventana "Propiedades de TCP/IPv4" con campos de IP por octeto, cable de red, Wi-Fi y Firefox. Si la IP está fuera del segmento o repetida, las páginas no cargan. |
| Terminal Linux | Estilo Ubuntu, contraseña de sesión al abrirla, `su - sysadmin`, `sudo`, `ip a`, `cd`, `ls`, `pwd`, `cat`, `nano`, `cp`, `ping` y `ping -c 40` en tiempo real (Ctrl+C), `sudo reboot` con arranque animado, historial (↑), autocompletado (Tab) y permisos reales (sin `sudo` no se puede guardar `/etc/network/interfaces`). |
| nano | Edición real, `Ctrl+O` + Enter para guardar, `Ctrl+X` para salir (con "Save modified buffer?"), `Ctrl+K`/`Ctrl+U`, barra de atajos clicable. |
| Interfaces web | Biométrico, Yealink T30P, HME 60 (ZOOM Nitro) y HME 50, impresora (HP o Kyocera, web o display físico), módem Telmex, Digi (no te toca), speedtest con captura. |
| Físico | Rack con drag & drop de patch cords (o toque-y-toque en celular), FortiGate 40F, switch de 48 puertos con VLANs, SW Plano, switch anterior, ONT/módems, etiquetas L5/L6-ONT y hoja de etiquetado. |
| Hardware | Gabinete de la PC Gerencial (apagar, quitar corriente, tornillos, tapa, ranura PCI, tarjeta) y BIOS azul navegable con teclado (F2/F8/F12, F10). |
| Validación | El motor revisa de verdad los archivos (`interfaces`, `fingerprint.conf`, `timer.conf`), la red (dominios L2/VLAN, gateways, enlaces WAN) y el orden del procedimiento. |

## Arquitectura

```
src/
├─ data/
│  ├─ sucursal.ts      ← ARCHIVO ÚNICO DE DATOS: IPs, credenciales, equipos, hoja de etiquetado, carriers y textos de cada paso
│  ├─ errores.ts       ← catálogo de errores: "qué pasaría en la vida real" y "cómo corregirlo"
│  └─ preguntas.ts     ← preguntas teóricas del examen
├─ engine/             ← motor de pasos (lo comparten el modo guiado y el examen)
│  ├─ tipos.ts         ← estado (SimState), acciones y escenario
│  ├─ escenario.ts     ← sucursal guiada y generador de exámenes aleatorios (con semilla)
│  ├─ motor.ts         ← reductor: aplica acciones, reglas y errores, y evalúa objetivos
│  ├─ objetivos.ts     ← lista de objetivos con validadores, prerrequisitos (fuera de orden) y guía
│  ├─ red.ts           ← modelo de red: dominios L2/VLAN, gateways, WAN, DHCP, ping, web y speedtest
│  ├─ cables.ts        ← patch cords del rack y a qué red queda cada puerto
│  ├─ calificacion.ts  ← calificación del examen
│  ├─ SimProvider.tsx  ← contexto React + guardado en localStorage
│  └─ linux/           ← intérprete de la terminal, sistema de archivos virtual, parser de interfaces y .conf
├─ components/
│  ├─ escena/          ← plano isométrico (SVG) y marcadores
│  ├─ rack/            ← rack con cableado drag & drop y hoja de etiquetado
│  ├─ terminal/        ← terminal y editor nano
│  ├─ navegador/       ← "Firefox" simulado y las páginas web de cada equipo
│  ├─ escritorio/      ← escritorio Ubuntu, laptop Windows y ventanas
│  ├─ hardware/        ← gabinete de la PC y BIOS
│  ├─ equipos/         ← teléfono, biométrico, impresora, HME, Digi… como objetos físicos
│  └─ layout/          ← barra superior, panel de misión, examen, libreta, resaltador, preguntas
├─ pages/              ← Inicio, Simulador, Referencia, Resultados y Evidencias
└─ lib/                ← utilidades de IP, aleatorio con semilla, almacenamiento, sonidos y rutas
```

**Cómo funciona el motor.** Cada acción (cambiar la IP de un equipo, guardar un archivo, mover un cable, hacer un ping…) pasa por `reducir()` en `engine/motor.ts`, que aplica las reglas (por ejemplo: cambiar un equipo sin haber anotado su IP actual cuenta como error) y después evalúa la lista de objetivos de `engine/objetivos.ts`. Cada objetivo tiene un validador, una lista de prerrequisitos (si se cumple antes que ellos queda marcado "fuera de orden") y una lista de elementos de la interfaz a resaltar en el modo guiado. El modo guiado muestra el primer objetivo pendiente; el modo examen solo los califica.

## Correrlo en tu computadora (Ubuntu)

Requisitos: Node.js 20.19+ o 22.12+ (probado con Node 24).

```bash
npm install
npm run dev
```

Abre la dirección que imprime Vite (normalmente http://localhost:5173).

Otros comandos:

```bash
npm run build     # genera el sitio estático en dist/
npm run preview   # sirve dist/ para revisarlo antes de publicar
npm run lint      # revisión con oxlint
```

## Publicarlo

El sitio es 100 % estático y usa rutas relativas (`base: './'`) y navegación por `#`, así que funciona en cualquier carpeta o subdominio.

### Opción A: GitHub Pages (automático)

1. Crea un repositorio en GitHub y sube el proyecto (rama `main`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica. La URL queda como `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

### Opción B: subdominio de Hostinger

1. `npm run build`
2. En hPanel crea el subdominio (por ejemplo `simulador.tudominio.com`).
3. Abre el **Administrador de archivos** (o FTP) en la carpeta del subdominio (`public_html/simulador` o la que indique hPanel) y sube **el contenido** de `dist/` (no la carpeta `dist` en sí): `index.html`, `favicon.svg` y la carpeta `assets/`.

## Personalizar los datos

Todo está en `src/data/sucursal.ts`:

- `credenciales`: placeholders (`demo123`, etc.) fáciles de reemplazar.
- `passwordPcGerencial(ceco)`: regla `0 + CECO + suma de dígitos (2) + r` (CECO 312 → `031206r`).
- `sucursalEjemplo`: la sucursal del modo guiado (segmentos, HME, PCI, carriers, puerto dañado…).
- `equiposRed`, `equiposVlan40`, `pcRedCocina`, `destinosValidacion`, `hojaEtiquetado`, `carriers`.
- `poolExamen`: de dónde salen los datos aleatorios del examen.
- `pasos`: los textos del modo guiado (admiten variables como `{nueva.bio}` o `{vieja.pc}`).

## Notas

- En un navegador, **Ctrl+T abre una pestaña nueva** y la página no puede impedirlo. En el simulador la terminal se abre con el ícono del dock, con el botón "Ctrl+T" de la barra superior del escritorio o con **Alt+T**.
- **Ctrl+W cierra la pestaña** del navegador: en nano usa el botón `^W` de la barra para buscar.
- El ping puede ir "rápido" (simulado) o "real" (1 por segundo): se cambia en el botón de ajustes o en la esquina de la terminal.
- Sonidos opcionales (WebAudio, sin archivos) desde el botón de ajustes.
