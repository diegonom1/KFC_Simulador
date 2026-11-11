// Catálogo de errores: qué pasaría en la vida real y cómo corregirlo.
// leve = advertencia (resta menos en el examen).

export interface DefError {
  titulo: string
  detalle: string
  correccion: string
  leve?: boolean
}

export const catalogoErrores: Record<string, DefError> = {
  SIN_RESPALDO: {
    titulo: 'Cambiaste la IP sin anotar la actual',
    detalle:
      'En la vida real, si algo sale mal no tendrías a qué IP regresar el equipo (rollback) y podrías dejarlo sin servicio mientras lo buscas.',
    correccion: 'Antes de tocar un equipo, anota su IP actual en la Libreta. Hazlo ahora para tener el respaldo.',
  },
  IP_INCORRECTA: {
    titulo: 'La IP no coincide con la tabla',
    detalle:
      'El equipo quedaría en una dirección que nadie espera: la PC Gerencial, PRB y soporte no lo encontrarían. Si además queda fuera de tu segmento, pierdes el acceso a su página.',
    correccion:
      'Revisa la tabla de direccionamiento y vuelve a capturar la IP exacta. Si perdiste el acceso, en la vida real tendrías que buscarlo con un escaneo de red o restablecerlo de fábrica (en el simulador: botón "Recuperar acceso" del equipo).',
  },
  MASCARA_GW: {
    titulo: 'Máscara o gateway incorrectos',
    detalle: 'Con una máscara o gateway mal puestos el equipo puede responder en la red local pero no sale a otros segmentos ni a internet.',
    correccion: 'Usa la máscara y el gateway del segmento nuevo (el gateway es la .1, el FortiGate).',
  },
  PC_ANTES: {
    titulo: 'Cambiaste la PC Gerencial antes que los demás',
    detalle:
      'La PC Gerencial quedó en el segmento nuevo y ya no "ve" a los equipos que siguen en el segmento viejo: desde ella ya no puedes configurarlos ni la tienda recibe sus datos.',
    correccion: 'La PC Gerencial siempre va al final. Termina los equipos pendientes desde la laptop (que sigue en el segmento viejo).',
  },
  ALIAS_MODIFICADO: {
    titulo: 'Modificaste eth0:1 sin motivo',
    detalle: 'eth0:1 es la red de cocina (KDS). Si cambias sus valores, la PC deja de comunicarse con las pantallas de cocina.',
    correccion: 'Deja eth0:1 exactamente igual. Solo se sustituye por eth1 cuando hay tarjeta nueva, conservando address y netmask.',
  },
  ETH1_SIN_HW: {
    titulo: 'Configuraste eth1 sin tener la tarjeta lista',
    detalle: 'Al arrancar, Linux no encuentra eth1 ("Cannot find device eth1") y la red de cocina se queda sin IP.',
    correccion: 'Primero instala la tarjeta (o habilita la Realtek en la BIOS) y después cambia eth0:1 por eth1.',
  },
  INTERFACES: {
    titulo: 'Valores incorrectos en /etc/network/interfaces',
    detalle: 'Al reiniciar, la interfaz levanta con datos equivocados o no levanta: el equipo queda fuera de la red.',
    correccion: 'Abre de nuevo el archivo con sudo nano, corrige los cinco valores de eth0 y reinicia.',
  },
  CONF_CREDENCIALES: {
    titulo: 'Cambiaste usuario o contraseña en un .conf',
    detalle: 'La PC ya no podría autenticarse con el biométrico / HME y dejaría de recibir checadas o tiempos.',
    correccion: 'En fingerprint.conf y timer.conf solo se cambia la línea IP=. Regresa usuario y contraseña a como estaban.',
  },
  CONF_IP: {
    titulo: 'IP equivocada en un .conf',
    detalle: 'La PC Gerencial buscaría al equipo en una IP donde no está.',
    correccion: 'Pon exactamente la IP nueva de la tabla en la línea IP=.',
  },
  HME_CAMPOS: {
    titulo: 'Cambiaste campos de más en el HME',
    detalle: 'En Control Unit Network solo se cambian IP Address y Gateway. Tocar la máscara o los DNS puede dejar al HME sin comunicación con los auriculares o con la PC.',
    correccion: 'Regresa los demás campos a su valor original y cambia solo IP y Gateway.',
  },
  DNS_TEL: {
    titulo: 'DNS del teléfono incorrectos',
    detalle: 'Sin los DNS correctos el teléfono no resuelve el servidor de la central y no se registra (no hay tono).',
    correccion: 'Static DNS On: primario 8.8.4.4 y secundario 8.8.8.8.',
  },
  FORTILINK_INCORRECTO: {
    titulo: 'PORT-A en el puerto equivocado',
    detalle: 'Sin el enlace FortiLink en el puerto 48, el switch no recibe su configuración ni las VLAN: nada sale a internet.',
    correccion: 'PORT-A del FortiGate → puerto 48 del switch.',
  },
  CABLEADO_FINAL: {
    titulo: 'Cableado final incorrecto',
    detalle: 'Al entregar, el rack no coincide con las reglas: algún equipo quedaría sin servicio o en la red equivocada.',
    correccion: 'Revisa la hoja de etiquetado y las reglas de cableado antes de irte.',
  },
  DIGI: {
    titulo: 'El Digi no te toca',
    detalle: 'El Digi lo configura PRB de forma remota. Si lo modificas, PRB pierde el control del equipo.',
    correccion: 'Solo valida que responda con ping a su IP nueva al final.',
    leve: true,
  },
  WIFI_SPEEDTEST: {
    titulo: 'Speedtest por Wi-Fi',
    detalle: 'El Wi-Fi mide la señal inalámbrica, no el enlace. La evidencia no es válida y suele salir más baja.',
    correccion: 'Conecta la laptop con cable directo a un LAN del módem y apaga el Wi-Fi.',
    leve: true,
  },
  SPEEDTEST_COMPARTIDO: {
    titulo: 'Speedtest con otros equipos usando la red',
    detalle: 'El FortiGate u otros equipos consumen ancho de banda al mismo tiempo: el resultado sale bajo y no sirve como evidencia.',
    correccion: 'Desconecta temporalmente lo demás del módem, corre la prueba y luego reconecta.',
    leve: true,
  },
  SPEEDTEST_NO_DIRECTO: {
    titulo: 'Speedtest sin conexión directa al módem',
    detalle: 'Si la laptop pasa por el switch y el FortiGate, mides la red interna, no el enlace del carrier.',
    correccion: 'Conecta la laptop directo a un LAN del módem que vas a medir.',
    leve: true,
  },
  ELECTRICO: {
    titulo: 'Abriste la PC con corriente',
    detalle: 'Riesgo de descarga eléctrica y de dañar la tarjeta madre o la tarjeta nueva con un corto.',
    correccion: 'Apaga desde el sistema, desconecta el cable de corriente y después abre la tapa.',
  },
  APAGADO_BRUSCO: {
    titulo: 'Quitaste la corriente con la PC encendida',
    detalle: 'Un apagado brusco puede corromper el sistema de archivos y la base de datos del punto de venta.',
    correccion: 'Apaga siempre desde el sistema (o con sudo poweroff) antes de quitar la corriente.',
  },
  TARJETA_SIN_TORNILLO: {
    titulo: 'Cerraste sin atornillar la tarjeta',
    detalle: 'Una tarjeta suelta se puede salir de la ranura al conectar el cable y dejar a la PC sin red de cocina.',
    correccion: 'Atornilla la tarjeta a la ranura antes de cerrar.',
    leve: true,
  },
  VLAN_INCORRECTA: {
    titulo: 'Conectaste en un puerto de otra VLAN',
    detalle: 'El equipo quedaría en otra red (otra VLAN) y no tendría comunicación con su segmento.',
    correccion: 'Conéctalo en el puerto que indica la hoja de etiquetado; si está dañado, en otro puerto libre de la misma VLAN.',
  },
  PUERTO_FORTILINK: {
    titulo: 'Usaste el puerto 48',
    detalle: 'El puerto 48 está reservado para el PORT-A del FortiGate (FortiLink). Sin él, el switch se queda sin salida.',
    correccion: 'Deja el 48 solo para el cable del puerto A del FortiGate.',
  },
  PUERTO_DANADO: {
    titulo: 'Conectaste en un puerto dañado',
    detalle: 'El puerto no da enlace (LED apagado): el equipo se queda sin red aunque el cable esté bien.',
    correccion: 'Usa otro puerto libre de la misma VLAN y anota el cambio.',
    leve: true,
  },
  MODEM_EXTRA: {
    titulo: 'Conectaste un módem adicional',
    detalle: 'Un módem de más puede repartir IPs o crear una salida paralela que rompa el SD-WAN.',
    correccion: 'Los módems adicionales deben quedar sin nada conectado.',
  },
  WAN_INCORRECTO: {
    titulo: 'Enlace en el puerto equivocado del FortiGate',
    detalle: 'El FortiGate espera Totalplay en WAN y Telmex en PORT1. Cruzados, las políticas del SD-WAN no aplican y la tienda puede quedarse sin respaldo.',
    correccion: 'TP → WAN, Telmex → PORT1 (si solo hay Telmex, va al WAN).',
  },
  PROVEEDOR_RED: {
    titulo: 'Equipo de proveedor en la red de la tienda',
    detalle: 'Los equipos de proveedores no deben entrar a la red interna: es un riesgo de seguridad y ocupan puertos de la hoja.',
    correccion: 'Conéctalos al SW Plano (cualquier puerto).',
  },
  ETIQUETA: {
    titulo: 'Etiqueta equivocada',
    detalle: 'Soporte remoto se guiaría por la etiqueta y podría reiniciar o desconectar el enlace equivocado.',
    correccion: 'Totalplay lleva L5-ONT y Telmex lleva L6-ONT.',
    leve: true,
  },
  TELMEX_IP: {
    titulo: 'IP del módem Telmex incorrecta',
    detalle: 'El FortiGate no recibiría el enlace de Telmex en el segmento que espera.',
    correccion: 'Con dos carriers la IP LAN del Telmex es 192.168.0.1. Si solo hay Telmex, usa el direccionamiento de TP.',
  },
  IP_DUPLICADA: {
    titulo: 'IP repetida en la laptop',
    detalle: 'Dos equipos con la misma IP chocan en la red: las páginas no cargan y puedes tirar el servicio del otro equipo.',
    correccion: 'Elige una IP que no use nadie (revisa la tabla y la libreta).',
  },
  IP_FUERA_SEGMENTO: {
    titulo: 'La laptop quedó fuera del segmento',
    detalle: 'Con una IP de otro segmento o con otra máscara la laptop no alcanza a los equipos: las páginas no cargan.',
    correccion: 'Usa una IP libre del segmento actual de los equipos, con la misma máscara.',
    leve: true,
  },
  BIOS_EXTRA: {
    titulo: 'Cambiaste otras opciones de la BIOS',
    detalle: 'Cambiar opciones que no te tocan (arranque, SATA, etc.) puede impedir que la PC arranque.',
    correccion: 'En la BIOS solo se habilita la Controladora de LAN Realtek.',
    leve: true,
  },
  RESCATE: {
    titulo: 'Tuviste que recuperar el acceso a un equipo',
    detalle: 'En la vida real esto implica buscar el equipo con un escaneo de red o restablecerlo de fábrica, y reconfigurarlo completo.',
    correccion: 'Verifica dos veces la IP, máscara y gateway antes de guardar.',
    leve: true,
  },
  PRUEBA_PC: {
    titulo: 'Speedtest desde la PC Gerencial',
    detalle: 'La PC pasa por el switch y el FortiGate: no mide el enlace del carrier.',
    correccion: 'El speedtest se hace desde la laptop conectada directo al módem.',
    leve: true,
  },
}
