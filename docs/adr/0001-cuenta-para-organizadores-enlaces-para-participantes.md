# Cuenta para Organizadores, enlaces secretos para Participantes

El Organizador entra con email y contraseña, porque gestiona Sorteos de forma continuada y tiene que poder volver a entrar siempre. Los Participantes no se registran: acceden solo con su Enlace personal, que el Organizador reparte por el canal que prefiera. Así nadie más que el Organizador tiene que darse de alta, y el sistema no necesita guardar emails de los Participantes.

## Considered Options

- **Todos con cuenta**: se descartó porque obliga a cada Participante a registrarse para ver un solo nombre.
- **Todos sin cuenta (también el Organizador, con un Enlace de organizador)**: se descartó porque el enlace no se puede recuperar si se pierde.

## Consequences

- En la primera versión no hay recuperación de contraseña ni se verifica el email, así que no hace falta enviar correos. Si el Organizador olvida su contraseña, pierde el acceso a sus Sorteos. Se acepta conscientemente para mantener la primera versión sin servicio de correo.
