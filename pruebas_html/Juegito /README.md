# Última chispa

Roguelike de arena para navegador, hecho con Canvas 2D y JavaScript sin dependencias.

Abre `index.html` en Firefox, Chrome o Edge. No requiere Node.js ni instalación.

También puedes servir la carpeta con `python3 -m http.server 8000` y visitar http://localhost:8000.

## Controles

- WASD o flechas: moverse.
- Ratón: apuntar. Mantener clic izquierdo: disparar.
- P: pausar o continuar. Al cambiar de ventana se pausa automáticamente.

Elimina enemigos, recoge fragmentos verdes y elige una de tres mejoras al subir de nivel. Las oleadas se endurecen cada 22 segundos. Al morir comienza una partida nueva; el récord de bajas se guarda localmente si el navegador lo permite.

Prototipo pensado para teclado y ratón. Sin recursos externos, audio ni controles táctiles. La resolución de dibujo y el número de enemigos, proyectiles y partículas están limitados para controlar el consumo.

## Refugio y progreso permanente

La arena ocupa todo el ancho disponible. El menú incluye Jugar, Mejoras, Inventario, Gacha y Personaje. Brizna está disponible desde el inicio.

| Personaje | Rareza | Probabilidad | Peculiaridad |
| --- | --- | --- | --- |
| Brizna | Común | 60 % | +20 PV iniciales |
| Ráfaga | Raro | 25 % | +30 % de velocidad |
| Ascua | Épico | 10 % | Dos proyectiles iniciales |
| Sol | Legendario | 4 % | Duplica las monedas de enemigos |
| Nova | Ultralegendario | 1 % | Triple de daño base, incluidas las mejoras permanentes |

Cada invocación cuesta 50 monedas. Los duplicados devuelven 20. Los enemigos tienen un 25 % de probabilidad de dar 2 monedas (4 con Sol), abonadas directamente. Al morir o completar la partida se recibe una única recompensa de `10 + floor(segundos/5) + floor(bajas/2)`.

Vitalidad, Potencia, Agilidad y Cadencia tienen cinco niveles permanentes. El precio es el coste base multiplicado por el siguiente nivel: 50, 80, 40 y 60 monedas respectivamente. Se aplican al iniciar la siguiente partida y se combinan con el personaje equipado. Las mejoras de nivel durante la partida siguen siendo temporales.

Monedas, colección, personaje equipado, mejoras y récord se guardan en `localStorage` del navegador. El progreso depende del navegador y de la dirección desde la que se abre el juego; borrar sus datos elimina el guardado. Si el almacenamiento está bloqueado aparece un aviso y se puede seguir jugando durante la sesión.

## Vida y objetos

La vida base es de 100 PV. Brizna suma 20 PV y cada nivel de Vitalidad añade otros 20 PV. El contacto con enemigos quita 20 PV. Las mejoras temporales de salud suman 20 PV máximos o recuperan 60 PV, según la elección.

Los objetos se activan al tocarlos y desaparecen tras 30 segundos. Cada enemigo normal tiene un 3 % de probabilidad de soltar un orbe de curación (+), un 1 % de soltar una bomba (✹) y un 2 % de soltar un imán (∩). Los enemigos grandes morados tienen el doble de probabilidades.

El orbe cura un 10 % de la vida máxima sin superarla. La bomba elimina todos los enemigos cuyo centro está en pantalla, con bajas, monedas y experiencia, sin generar nuevos objetos. El imán atrae todos los fragmentos de experiencia existentes hacia el personaje a 600 píxeles por segundo. La experiencia se obtiene cuando llegan; los fragmentos nuevos conservan su recogida normal. Todos los objetos del suelo se reinician en cada partida.

## Fases y artefactos

Cada partida dura como máximo 15 minutos de juego activo. A los 5, 10 y 15 minutos se pausa para elegir un artefacto entre tres opciones no obtenidas. La elección de los 15 minutos es la recompensa final y después se muestra la victoria. Las pausas y selecciones no consumen tiempo. Los artefactos duran esa partida y sus efectos se combinan:

- Ojo del cometa: los proyectiles persiguen enemigos después de disparar; no dispara automáticamente.
- Aguja del vacío: cada proyectil atraviesa enemigos y golpea a cada uno una sola vez.
- Cristal invernal: los impactos ralentizan un 50 % durante 2 segundos.
- Espejo solar: hasta tres rebotes en los bordes y 4 segundos de duración de los proyectiles nuevos.

Al abandonar desde Menú se pierde la mitad de las monedas de esa partida, contando monedas de enemigos y recompensa de finalización. Se conserva `floor((monedas de enemigos + recompensa) / 2)`. Las monedas anteriores no se penalizan. La liquidación solo se aplica una vez. Morir o completar los 15 minutos permite conservar el total.

## Bosque y ruinas

Arena fija con hierba, dos caminos de tierra y un claro central pavimentado. Árboles, rocas y muros bloquean a personajes, enemigos y proyectiles (también a los perforantes). El imán puede atraer experiencia a través del terreno. Los enemigos comparten un mapa de rutas actualizado periódicamente para rodear obstáculos. Al cambiar el tamaño de la ventana se ajusta el escenario y se reubican los personajes que queden dentro de un obstáculo.

El terreno se dibuja con Canvas y se almacena en una capa estática; no descarga imágenes ni requiere dependencias. `terrain.js` contiene el diseño, las colisiones y la navegación.

## Estilo pixel art

El terreno usa baldosas de hierba y tierra y sprites dibujados por código para árboles, rocas, personajes, enemigos y objetos (`pixel-art.js`). El lienzo se representa a media resolución y se escala sin suavizado. Los sprites se guardan en caché y el terreno mantiene su capa estática. No requiere imágenes externas.

## Entorno variable

Cada partida crea una semilla nueva para distribuir árboles, rocas y ruinas, variar la curva de los caminos y elegir entre tres paletas de bosque. La zona central queda libre, se mantienen corredores sin obstáculos y se comprueba la conectividad del mapa de navegación. La distribución se adapta al tamaño de la arena; cambiar la ventana conserva la semilla y el plano de esa partida. El escenario sigue pintándose en una capa estática.

## Nuevas mejoras al subir de nivel

- Imán: +60 px al radio de atracción de experiencia por elección (parte de 100 px). Los fragmentos vuelan hacia el personaje y dan XP al llegar. Es independiente del objeto imán que atrae toda la XP del mapa.
- Largo alcance: multiplica por 1,25 la duración y el alcance de los proyectiles, también con rebotes.
- Golpe crítico: +10 puntos porcentuales de probabilidad de doble daño por proyectil; límite de 60 %.
- Corteza protectora: reduce 3 PV el daño por contacto por elección, hasta un mínimo de 5 PV recibidos.

Son mejoras temporales, con iconos pixel art y comparación de estadísticas. Crítico y Corteza dejan de ofrecerse cuando alcanzan su límite.
