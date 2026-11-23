# Amigo Invisible

Organización de sorteos de amigo invisible: un grupo de personas se reparte al azar a quién le regala cada una.

## Language

**Sorteo**:
Un evento de amigo invisible con su grupo de Participantes y, una vez realizado, sus Asignaciones.
_Avoid_: Evento, grupo, partida, juego

**Organizador**:
La persona que crea y gestiona un Sorteo desde su Cuenta de organizador. Puede ver todas sus Asignaciones y normalmente también es Participante.
_Avoid_: Admin, creador, dueño

**Participante**:
Una persona incluida en un Sorteo, que regala a otra y recibe un regalo. Se identifica solo por su nombre.
_Avoid_: Usuario, jugador, miembro

**Asignación**:
La relación "Participante A regala a Participante B" dentro de un Sorteo.
_Avoid_: Emparejamiento, match, pareja

**Regalador / Destinatario**:
Los dos papeles de una Asignación: quién regala y quién recibe.
_Avoid_: Santa, emisor, receptor

**Enlace personal**:
La URL secreta de un Participante, con la que ve únicamente su propia Asignación. El Organizador la reparte por el canal que prefiera.
_Avoid_: Token, invitación, link de acceso

**Cuenta de organizador**:
El registro con email y contraseña con el que un Organizador entra para gestionar sus Sorteos. Los Participantes no tienen cuenta.
_Avoid_: Usuario, perfil, login, Enlace de organizador

## Sorteo

**Cadena**:
La forma que deben tener las Asignaciones de un Sorteo: un único ciclo que pasa por todos los Participantes (A→B→C→…→A), sin parejas mutuas.
_Avoid_: Ronda, círculo

**Rehacer el sorteo**:
Descartar todas las Asignaciones de un Sorteo y generar una Cadena nueva. Es la única forma de cambiar los Participantes una vez sorteado.
_Avoid_: Resortear, reajustar, reset

**Verificación**:
Un resumen que confirma que las Asignaciones forman una Cadena válida, sin mostrar ningún nombre.
_Avoid_: Validación, chequeo

**Revelar**:
La acción explícita del Organizador para ver todas las Asignaciones con sus nombres.
_Avoid_: Mostrar resultados, desvelar

**Presupuesto**:
El importe orientativo por regalo en euros, opcional y común a todo el Sorteo.
_Avoid_: Límite, precio máximo

**Fecha de entrega**:
El día en que se intercambian los regalos.
_Avoid_: Fecha límite, deadline

## Participante

**Le gusta / No le gusta**:
Dos textos libres que escribe cada Participante sobre sí mismo para orientar a su Regalador.
_Avoid_: Lista de deseos, wishlist, preferencias

**Visto**:
Indica que un Participante ya ha abierto su Enlace personal después del sorteo.
_Avoid_: Leído, confirmado
